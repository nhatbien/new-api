package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type sepayWebhookPayload struct {
	Content        string      `json:"content"`
	Description    string      `json:"description"`
	Code           string      `json:"code"`
	TransferType   string      `json:"transferType"`
	TransferAmount interface{} `json:"transferAmount"`
	Amount         interface{} `json:"amount"`
}

func parseSepayAmount(value interface{}) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case json.Number:
		amount, _ := v.Float64()
		return amount
	case string:
		normalized := strings.ReplaceAll(strings.TrimSpace(v), ",", "")
		amount, _ := strconv.ParseFloat(normalized, 64)
		return amount
	default:
		return 0
	}
}

func extractSepayTradeNo(payload sepayWebhookPayload, raw map[string]interface{}) string {
	candidates := []string{
		payload.Content,
		payload.Description,
		payload.Code,
	}
	for _, key := range []string{"transferContent", "transactionContent", "transaction_content", "addInfo", "add_info"} {
		if value, ok := raw[key].(string); ok {
			candidates = append(candidates, value)
		}
	}

	prefix := strings.TrimSpace(setting.SepayContentPrefix)
	if prefix == "" {
		prefix = "NAP"
	}
	pattern := regexp.MustCompile(regexp.QuoteMeta(prefix) + `([A-Za-z0-9_-]+)`)
	for _, candidate := range candidates {
		matches := pattern.FindStringSubmatch(candidate)
		if len(matches) == 2 {
			return strings.ToUpper(matches[1])
		}
	}
	return ""
}

func getExpectedSepayWebhookAmount(tradeNo string) int64 {
	if order := model.GetSubscriptionOrderByTradeNo(tradeNo); order != nil && order.PaymentProvider == model.PaymentProviderSepay {
		return decimal.NewFromFloat(getSepaySubscriptionPayMoney(order.Money)).Round(0).IntPart()
	}
	if topUp := model.GetTopUpByTradeNo(tradeNo); topUp != nil && topUp.PaymentProvider == model.PaymentProviderSepay {
		return decimal.NewFromFloat(topUp.Money).Round(0).IntPart()
	}
	return 0
}

func SepayWebhook(c *gin.Context) {
	if !setting.SepayEnabled || strings.TrimSpace(setting.SepayWebhookSecret) == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook rejected reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.String(http.StatusForbidden, "webhook disabled")
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY webhook body read failed client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid body"})
		return
	}
	if len(body) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "empty body"})
		return
	}

	decoder := json.NewDecoder(strings.NewReader(string(body)))
	decoder.UseNumber()
	var raw map[string]interface{}
	if err := decoder.Decode(&raw); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY webhook payload parse failed client_ip=%s error=%q body=%q", c.ClientIP(), err.Error(), string(body)))
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid json"})
		return
	}

	payloadBytes := common.GetJsonString(raw)
	var payload sepayWebhookPayload
	_ = json.Unmarshal([]byte(payloadBytes), &payload)

	if strings.EqualFold(strings.TrimSpace(payload.TransferType), "out") {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("SEPAY webhook ignored outgoing transfer client_ip=%s payload=%s", c.ClientIP(), payloadBytes))
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "ignored"})
		return
	}

	receivedAmount := parseSepayAmount(payload.TransferAmount)
	if receivedAmount <= 0 {
		receivedAmount = parseSepayAmount(payload.Amount)
	}

	tradeNo := extractSepayTradeNo(payload, raw)
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook ignored because trade_no was not found client_ip=%s payload=%s", c.ClientIP(), payloadBytes))
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "trade_no not found"})
		return
	}
	if receivedAmount <= 0 {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook rejected because amount was not found trade_no=%s client_ip=%s payload=%s", tradeNo, c.ClientIP(), payloadBytes))
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "amount not found"})
		return
	}
	if expectedAmount := getExpectedSepayWebhookAmount(tradeNo); expectedAmount > 0 && decimal.NewFromFloat(receivedAmount).Round(0).IntPart() < expectedAmount {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook rejected because amount is insufficient trade_no=%s expected=%d actual=%.2f client_ip=%s", tradeNo, expectedAmount, receivedAmount, c.ClientIP()))
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "amount mismatch"})
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	if err := model.CompleteSubscriptionOrder(tradeNo, payloadBytes, model.PaymentProviderSepay, model.PaymentMethodSepay); err == nil {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("SEPAY subscription order processed successfully trade_no=%s amount=%.2f client_ip=%s", tradeNo, receivedAmount, c.ClientIP()))
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "success"})
		return
	} else if !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY subscription order processing failed trade_no=%s amount=%.2f client_ip=%s error=%q", tradeNo, receivedAmount, c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "order processing failed"})
		return
	}

	if err := model.RechargeSepay(tradeNo, payloadBytes, c.ClientIP()); err != nil {
		if errors.Is(err, model.ErrTopUpNotFound) {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook order not found trade_no=%s amount=%.2f client_ip=%s", tradeNo, receivedAmount, c.ClientIP()))
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "order not found"})
			return
		}
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY top-up processing failed trade_no=%s amount=%.2f client_ip=%s error=%q", tradeNo, receivedAmount, c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "top-up processing failed"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("SEPAY top-up processed successfully trade_no=%s amount=%.2f client_ip=%s", tradeNo, receivedAmount, c.ClientIP()))
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "success",
	})
}

package controller

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type SepayPayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type SepayWebhookPayload struct {
	Id              int64   `json:"id"`
	Gateway         string  `json:"gateway"`
	TransactionDate string  `json:"transactionDate"`
	AccountNumber   string  `json:"accountNumber"`
	Code            string  `json:"code"`
	Content         string  `json:"content"`
	TransferType    string  `json:"transferType"`
	TransferAmount  float64 `json:"transferAmount"`
	Accumulated     float64 `json:"accumulated"`
	SubAccount      string  `json:"subAccount"`
	ReferenceCode   string  `json:"referenceCode"`
	Description     string  `json:"description"`
}

func RequestSepayPay(c *gin.Context) {
	var req SepayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	handleSepayPay(c, &req)
}

func handleSepayPay(c *gin.Context, req *SepayPayRequest) {
	if !isSepayTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "SEPAY 未启用"})
		return
	}
	if req.PaymentMethod != model.PaymentMethodSepay {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "不支持的支付渠道"})
		return
	}
	if req.Amount < int64(setting.SepayMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", setting.SepayMinTopUp)})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 1 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	vndAmount := int64(math.Round(payMoney))
	tradeNo := "SEPAY" + strings.ToUpper(strconv.FormatInt(time.Now().UnixMilli(), 36)) + strings.ToUpper(common.GetRandomString(5))
	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(amount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	if amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "无效的充值额度"})
		return
	}
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           float64(vndAmount),
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodSepay,
		PaymentProvider: model.PaymentProviderSepay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	qrURL := buildVietQRURL(setting.SepayBankCode, setting.SepayAccountNumber, setting.SepayQrTemplate, vndAmount, tradeNo, setting.SepayAccountName)
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("SEPAY VietQR 充值订单创建成功 user_id=%d trade_no=%s amount=%d money=%d", id, tradeNo, req.Amount, vndAmount))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"trade_no":       tradeNo,
			"qr_url":         qrURL,
			"amount":         vndAmount,
			"bank_code":      setting.SepayBankCode,
			"account_number": setting.SepayAccountNumber,
			"account_name":   setting.SepayAccountName,
			"description":    tradeNo,
		},
	})
}

func buildVietQRURL(bankCode string, accountNumber string, template string, amount int64, addInfo string, accountName string) string {
	if strings.TrimSpace(template) == "" {
		template = "compact2"
	}
	path := fmt.Sprintf("https://img.vietqr.io/image/%s-%s-%s.png", url.PathEscape(bankCode), url.PathEscape(accountNumber), url.PathEscape(template))
	values := url.Values{}
	values.Set("amount", strconv.FormatInt(amount, 10))
	values.Set("addInfo", addInfo)
	if strings.TrimSpace(accountName) != "" {
		values.Set("accountName", accountName)
	}
	return path + "?" + values.Encode()
}

func SepayWebhook(c *gin.Context) {
	if !isSepayWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.JSON(http.StatusOK, gin.H{"success": false})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY webhook 读取请求体失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, gin.H{"success": false})
		return
	}
	if !verifySepayWebhook(c, body) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook 验证失败 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.JSON(http.StatusOK, gin.H{"success": false})
		return
	}

	var payload SepayWebhookPayload
	if err := common.Unmarshal(body, &payload); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY webhook 解析失败 path=%q client_ip=%s error=%q body=%q", c.Request.RequestURI, c.ClientIP(), err.Error(), string(body)))
		c.JSON(http.StatusOK, gin.H{"success": false})
		return
	}
	if !strings.EqualFold(payload.TransferType, "in") {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	if setting.SepayAccountNumber != "" && payload.AccountNumber != "" && payload.AccountNumber != setting.SepayAccountNumber {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook account mismatch expected=%s actual=%s id=%d", setting.SepayAccountNumber, payload.AccountNumber, payload.Id))
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}

	tradeNo := resolveSepayTradeNo(&payload)
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("SEPAY webhook không tìm thấy mã đơn id=%d code=%q content=%q description=%q", payload.Id, payload.Code, payload.Content, payload.Description))
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	if err := completeSepayTopUp(tradeNo, payload.TransferAmount, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY 充值处理失败 trade_no=%s id=%d error=%q", tradeNo, payload.Id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"success": false})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("SEPAY 充值成功 trade_no=%s id=%d amount=%.0f", tradeNo, payload.Id, payload.TransferAmount))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func verifySepayWebhook(c *gin.Context, body []byte) bool {
	secret := strings.TrimSpace(setting.SepayWebhookSecret)
	if secret == "" {
		return false
	}

	for _, headerName := range []string{"Authorization", "X-Webhook-Secret", "X-Sepay-Webhook-Secret"} {
		value := strings.TrimSpace(c.GetHeader(headerName))
		if value == "" {
			continue
		}
		value = strings.TrimPrefix(value, "Bearer ")
		value = strings.TrimPrefix(value, "Apikey ")
		value = strings.TrimSpace(value)
		if hmac.Equal([]byte(value), []byte(secret)) {
			return true
		}
	}

	signature := strings.TrimSpace(c.GetHeader("X-Sepay-Signature"))
	signature = strings.TrimPrefix(signature, "sha256=")
	if signature == "" {
		return false
	}
	timestamp := strings.TrimSpace(c.GetHeader("X-Sepay-Timestamp"))
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil || math.Abs(float64(time.Now().Unix()-ts)) > 300 {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}

var sepayTradeNoPattern = regexp.MustCompile(`SEPAY[A-Z0-9]{8,32}`)

func resolveSepayTradeNo(payload *SepayWebhookPayload) string {
	for _, candidate := range []string{payload.Code, payload.ReferenceCode, payload.Content, payload.Description} {
		candidate = strings.ToUpper(strings.TrimSpace(candidate))
		if candidate == "" {
			continue
		}
		if strings.HasPrefix(candidate, "SEPAY") {
			if match := sepayTradeNoPattern.FindString(candidate); match != "" {
				return match
			}
			return candidate
		}
		if match := sepayTradeNoPattern.FindString(candidate); match != "" {
			return match
		}
	}
	return ""
}

func completeSepayTopUp(tradeNo string, paidAmount float64, callerIp string) error {
	if tradeNo == "" {
		return errors.New("未提供支付单号")
	}

	refCol := "`trade_no`"
	if common.UsingPostgreSQL {
		refCol = `"trade_no"`
	}

	var userId int
	var quotaToAdd int
	var payMoney float64
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		topUp := &model.TopUp{}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", tradeNo).First(topUp).Error; err != nil {
			return model.ErrTopUpNotFound
		}
		if topUp.PaymentProvider != model.PaymentProviderSepay {
			return model.ErrPaymentMethodMismatch
		}
		if topUp.Status == common.TopUpStatusSuccess {
			return nil
		}
		if topUp.Status != common.TopUpStatusPending {
			return model.ErrTopUpStatusInvalid
		}
		if paidAmount+0.0001 < topUp.Money {
			return fmt.Errorf("paid amount %.0f smaller than expected %.0f", paidAmount, topUp.Money)
		}

		dAmount := decimal.NewFromInt(topUp.Amount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		quotaToAdd = int(dAmount.Mul(dQuotaPerUnit).IntPart())
		if quotaToAdd <= 0 {
			return errors.New("无效的充值额度")
		}

		topUp.CompleteTime = common.GetTimestamp()
		topUp.Status = common.TopUpStatusSuccess
		if err := tx.Save(topUp).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", topUp.UserId).Update("quota", gorm.Expr("quota + ?", quotaToAdd)).Error; err != nil {
			return err
		}
		userId = topUp.UserId
		payMoney = topUp.Money
		return nil
	})
	if err != nil {
		return err
	}
	if quotaToAdd > 0 {
		model.RecordTopupLog(userId, fmt.Sprintf("使用 SEPAY VietQR 充值成功，充值金额: %v，支付金额：%.0f VND", logger.FormatQuota(quotaToAdd), payMoney), callerIp, model.PaymentMethodSepay, model.PaymentProviderSepay)
	}
	return nil
}

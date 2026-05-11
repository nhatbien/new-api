package controller

import (
	"fmt"
	"net/http"
	"net/url"
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
)

type SepayPayRequest struct {
	Amount int64 `json:"amount"`
}

func getSepayPayMoney(amount int64, group string) float64 {
	dAmount := decimal.NewFromInt(amount)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		dAmount = dAmount.Div(dQuotaPerUnit)
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok && ds > 0 {
		discount = ds
	}

	payMoney := dAmount.
		Mul(decimal.NewFromFloat(setting.SepayUnitPrice)).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discount))

	return payMoney.InexactFloat64()
}

func getSepayMinTopup() int64 {
	minTopup := setting.SepayMinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dMinTopup := decimal.NewFromInt(int64(minTopup))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		minTopup = int(dMinTopup.Mul(dQuotaPerUnit).IntPart())
	}
	return int64(minTopup)
}

func buildVietQRImageURL(payMoney float64, tradeNo string) string {
	bankCode := strings.TrimSpace(setting.SepayBankCode)
	accountNumber := strings.TrimSpace(setting.SepayAccountNumber)
	template := strings.TrimSpace(setting.SepayQrTemplate)
	if template == "" {
		template = "compact2"
	}

	q := url.Values{}
	q.Set("amount", strconv.FormatInt(decimal.NewFromFloat(payMoney).Round(0).IntPart(), 10))
	q.Set("addInfo", getSepayTransferContent(tradeNo))
	if accountName := strings.TrimSpace(setting.SepayAccountName); accountName != "" {
		q.Set("accountName", accountName)
	}

	return fmt.Sprintf(
		"https://img.vietqr.io/image/%s-%s-%s.png?%s",
		url.PathEscape(bankCode),
		url.PathEscape(accountNumber),
		url.PathEscape(template),
		q.Encode(),
	)
}

func getSepayTransferContent(tradeNo string) string {
	contentPrefix := strings.TrimSpace(setting.SepayContentPrefix)
	if contentPrefix == "" {
		contentPrefix = "NAP"
	}
	return fmt.Sprintf("%s %s", contentPrefix, tradeNo)
}

func RequestSepayAmount(c *gin.Context) {
	var req SepayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "invalid parameters"})
		return
	}
	if req.Amount < getSepayMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("Top-up amount cannot be less than %d", getSepayMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to get user group"})
		return
	}

	common.ApiSuccess(c, strconv.FormatFloat(getSepayPayMoney(req.Amount, group), 'f', 2, 64))
}

func RequestSepayPay(c *gin.Context) {
	if !setting.SepayEnabled {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "SEPAY payment is disabled"})
		return
	}
	if strings.TrimSpace(setting.SepayBankCode) == "" ||
		strings.TrimSpace(setting.SepayAccountNumber) == "" ||
		strings.TrimSpace(setting.SepayAccountName) == "" {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "SEPAY payment information is not configured"})
		return
	}

	var req SepayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "invalid parameters"})
		return
	}
	if req.Amount < getSepayMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("Top-up amount cannot be less than %d", getSepayMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to get user group"})
		return
	}

	payMoney := getSepayPayMoney(req.Amount, group)
	if payMoney < 1 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "top-up amount is too low"})
		return
	}

	tradeNo := fmt.Sprintf("USR%dNO%s%d", id, common.GetRandomString(6), time.Now().Unix())
	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(amount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}

	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodSepay,
		PaymentProvider: model.PaymentProviderSepay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY failed to create top-up order user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to create order"})
		return
	}

	qrURL := buildVietQRImageURL(payMoney, tradeNo)
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("SEPAY VietQR top-up order created successfully user_id=%d trade_no=%s amount=%d money=%.2f qr_url=%q", id, tradeNo, req.Amount, payMoney, qrURL))
	common.ApiSuccess(c, gin.H{
		"trade_no":         tradeNo,
		"payment_url":      qrURL,
		"qr_url":           qrURL,
		"amount":           decimal.NewFromFloat(payMoney).Round(0).IntPart(),
		"transfer_content": getSepayTransferContent(tradeNo),
	})
}

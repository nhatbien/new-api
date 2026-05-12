package controller

import (
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type SubscriptionSepayPayRequest struct {
	PlanId int `json:"plan_id"`
}

func generateSepaySubscriptionTradeNo(userId int) string {
	return fmt.Sprintf("SUBS%d%s", userId, strings.ToUpper(common.GetRandomString(8)))
}

func getSepaySubscriptionPayMoney(priceAmount float64) float64 {
	return decimal.NewFromFloat(priceAmount).
		Mul(decimal.NewFromFloat(setting.SepayUnitPrice)).
		InexactFloat64()
}

func SubscriptionRequestSepayPay(c *gin.Context) {
	if !setting.SepayEnabled {
		common.ApiErrorMsg(c, "SEPAY payment is disabled")
		return
	}
	if strings.TrimSpace(setting.SepayBankCode) == "" ||
		strings.TrimSpace(setting.SepayAccountNumber) == "" ||
		strings.TrimSpace(setting.SepayAccountName) == "" {
		common.ApiErrorMsg(c, "SEPAY payment information is not configured")
		return
	}

	var req SubscriptionSepayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "Invalid parameters")
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "Plan is disabled")
		return
	}
	if plan.PriceAmount < 0.01 {
		common.ApiErrorMsg(c, "Plan amount is too low")
		return
	}

	userId := c.GetInt("id")
	if plan.MaxPurchasePerUser > 0 {
		count, err := model.CountUserSubscriptionsByPlan(userId, plan.Id)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if count >= int64(plan.MaxPurchasePerUser) {
			common.ApiErrorMsg(c, "This plan has reached the per-user purchase limit")
			return
		}
	}

	payMoney := getSepaySubscriptionPayMoney(plan.PriceAmount)
	if payMoney < 1 {
		common.ApiErrorMsg(c, "Plan amount is too low")
		return
	}

	tradeNo := generateSepaySubscriptionTradeNo(userId)
	order := &model.SubscriptionOrder{
		UserId:          userId,
		PlanId:          plan.Id,
		Money:           plan.PriceAmount,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodSepay,
		PaymentProvider: model.PaymentProviderSepay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("SEPAY failed to create subscription order user_id=%d trade_no=%s plan_id=%d error=%q", userId, tradeNo, plan.Id, err.Error()))
		common.ApiErrorMsg(c, "Failed to create order")
		return
	}

	qrURL := buildVietQRImageURL(payMoney, tradeNo)
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("SEPAY subscription order created successfully user_id=%d trade_no=%s plan_id=%d money=%.2f pay_money=%.2f qr_url=%q", userId, tradeNo, plan.Id, plan.PriceAmount, payMoney, qrURL))
	common.ApiSuccess(c, gin.H{
		"trade_no":         tradeNo,
		"payment_url":      qrURL,
		"qr_url":           qrURL,
		"amount":           decimal.NewFromFloat(payMoney).Round(0).IntPart(),
		"transfer_content": getSepayTransferContent(tradeNo),
	})
}

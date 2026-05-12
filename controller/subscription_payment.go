package controller

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type SubscriptionPayRequest struct {
	PlanId          int    `json:"plan_id"`
	PaymentProvider string `json:"payment_provider"`
	PaymentMethod   string `json:"payment_method"`
}

func SubscriptionRequestPay(c *gin.Context) {
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.ApiErrorMsg(c, "Invalid parameters")
		return
	}

	var req SubscriptionPayRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "Invalid parameters")
		return
	}

	resetBody := func() {
		c.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	}

	provider := strings.ToLower(strings.TrimSpace(req.PaymentProvider))
	if provider == "" {
		switch strings.ToLower(strings.TrimSpace(req.PaymentMethod)) {
		case model.PaymentMethodStripe:
			provider = model.PaymentProviderStripe
		case model.PaymentMethodCreem:
			provider = model.PaymentProviderCreem
		case model.PaymentMethodSepay:
			provider = model.PaymentProviderSepay
		default:
			provider = model.PaymentProviderEpay
		}
	}

	resetBody()
	switch provider {
	case model.PaymentProviderStripe:
		SubscriptionRequestStripePay(c)
	case model.PaymentProviderCreem:
		SubscriptionRequestCreemPay(c)
	case model.PaymentProviderSepay:
		SubscriptionRequestSepayPay(c)
	case model.PaymentProviderEpay:
		SubscriptionRequestEpay(c)
	default:
		common.ApiErrorMsg(c, "Payment method does not exist")
	}
}

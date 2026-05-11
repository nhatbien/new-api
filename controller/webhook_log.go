package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func GetWebhookLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	provider := c.Query("provider")
	outcome := c.Query("outcome")

	logs, total, err := model.GetWebhookLogs(provider, outcome, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	common.ApiSuccess(c, pageInfo)
}

func DeleteWebhookLogs(c *gin.Context) {
	targetTimestamp, err := strconv.ParseInt(c.Query("target_timestamp"), 10, 64)
	if err != nil || targetTimestamp <= 0 {
		common.ApiErrorMsg(c, "invalid target timestamp")
		return
	}

	deleted, err := model.DeleteOldWebhookLogs(targetTimestamp)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{"deleted": deleted})
}

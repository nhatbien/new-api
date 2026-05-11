package model

import (
	"strings"

	"gorm.io/gorm"
)

type WebhookLog struct {
	Id             int    `json:"id"`
	Provider       string `json:"provider" gorm:"type:varchar(64);index"`
	Method         string `json:"method" gorm:"type:varchar(16)"`
	Path           string `json:"path" gorm:"type:varchar(512);index"`
	Query          string `json:"query" gorm:"type:text"`
	ClientIP       string `json:"client_ip" gorm:"type:varchar(64);index"`
	Headers        string `json:"headers" gorm:"type:text"`
	RequestBody    string `json:"request_body" gorm:"type:text"`
	ResponseStatus int    `json:"response_status" gorm:"index"`
	ResponseBody   string `json:"response_body" gorm:"type:text"`
	Outcome        string `json:"outcome" gorm:"type:varchar(32);index"`
	Error          string `json:"error" gorm:"type:text"`
	CreatedAt      int64  `json:"created_at" gorm:"index"`
}

func (WebhookLog) TableName() string {
	return "webhook_logs"
}

func CreateWebhookLog(log *WebhookLog) error {
	return DB.Create(log).Error
}

func GetWebhookLogs(provider, outcome string, startIdx, pageSize int) ([]*WebhookLog, int64, error) {
	tx := DB.Model(&WebhookLog{})
	if provider = strings.TrimSpace(provider); provider != "" {
		tx = tx.Where("provider = ?", provider)
	}
	if outcome = strings.TrimSpace(outcome); outcome != "" {
		tx = tx.Where("outcome = ?", outcome)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var logs []*WebhookLog
	err := tx.Order("id desc").Limit(pageSize).Offset(startIdx).Find(&logs).Error
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

func DeleteOldWebhookLogs(targetTimestamp int64) (int64, error) {
	result := DB.Where("created_at < ?", targetTimestamp).Delete(&WebhookLog{})
	if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
		return 0, result.Error
	}
	return result.RowsAffected, nil
}

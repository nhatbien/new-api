package middleware

import (
	"net/http"

	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

const (
	// SecureVerificationSessionKey 安全验证的 session key（与 controller 保持一致）
	SecureVerificationSessionKey       = "secure_verified_at"
	secureVerificationMethodSessionKey = "secure_verified_method"
	// SecureVerificationTimeout 验证有效期（秒）
	SecureVerificationTimeout = 300 // 5分钟
)

// SecureVerificationRequired 安全验证中间件
// 检查用户是否在有效时间内通过了安全验证
// 如果未验证或验证已过期，返回 401 错误
func SecureVerificationRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查用户是否已登录
		userId := c.GetInt("id")
		if userId == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "not logged in",
			})
			c.Abort()
			return
		}

		_, _, ok, err := service.GetSecureVerification(c, SecureVerificationSessionKey, secureVerificationMethodSessionKey, SecureVerificationTimeout)
		if err != nil {
			service.ClearSecureVerification(c, SecureVerificationSessionKey, secureVerificationMethodSessionKey)
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "verification state is abnormal, please verify again",
				"code":    "VERIFICATION_INVALID",
			})
			c.Abort()
			return
		}
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "security verification required",
				"code":    "VERIFICATION_REQUIRED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalSecureVerification 可选的安全验证中间件
// 如果用户已验证，则在 context 中设置标记，但不阻止请求继续
// 用于某些需要区分是否已验证的场景
func OptionalSecureVerification() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.GetInt("id")
		if userId == 0 {
			c.Set("secure_verified", false)
			c.Next()
			return
		}

		verifiedAt, _, ok, err := service.GetSecureVerification(c, SecureVerificationSessionKey, secureVerificationMethodSessionKey, SecureVerificationTimeout)
		if err != nil || !ok {
			c.Set("secure_verified", false)
			c.Next()
			return
		}

		c.Set("secure_verified", true)
		c.Set("secure_verified_at", verifiedAt)
		c.Next()
	}
}

// ClearSecureVerification 清除安全验证状态
// 用于用户登出或需要强制重新验证的场景
func ClearSecureVerification(c *gin.Context) {
	service.ClearSecureVerification(c, SecureVerificationSessionKey, secureVerificationMethodSessionKey)
}

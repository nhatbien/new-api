package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type SecureVerificationState struct {
	VerifiedAt     int64
	VerifiedMethod string
	PasskeyReadyAt int64
	ExpiresAt      int64
}

var secureVerificationStates sync.Map

func SetSecureVerification(c *gin.Context, verifiedKey, methodKey, passkeyReadyKey, method string, ttl int64) (int64, error) {
	now := time.Now().Unix()
	if storageKey, ok := secureVerificationStateKey(c); ok {
		secureVerificationStates.Store(storageKey, SecureVerificationState{
			VerifiedAt:     now,
			VerifiedMethod: method,
			ExpiresAt:      now + ttl,
		})
		return now, nil
	}

	session := sessions.Default(c)
	session.Delete(passkeyReadyKey)
	session.Set(verifiedKey, now)
	session.Set(methodKey, method)
	if err := session.Save(); err != nil {
		return 0, err
	}
	return now, nil
}

func GetSecureVerification(c *gin.Context, verifiedKey, methodKey string, ttl int64) (int64, string, bool, error) {
	if storageKey, ok := secureVerificationStateKey(c); ok {
		raw, found := secureVerificationStates.Load(storageKey)
		if !found {
			return 0, "", false, nil
		}
		state, ok := raw.(SecureVerificationState)
		if !ok || time.Now().Unix() >= state.ExpiresAt || state.VerifiedAt == 0 {
			secureVerificationStates.Delete(storageKey)
			return 0, "", false, nil
		}
		return state.VerifiedAt, state.VerifiedMethod, true, nil
	}

	session := sessions.Default(c)
	verifiedAtRaw := session.Get(verifiedKey)
	if verifiedAtRaw == nil {
		return 0, "", false, nil
	}
	verifiedAt, ok := verifiedAtRaw.(int64)
	if !ok {
		ClearSecureVerification(c, verifiedKey, methodKey)
		return 0, "", false, errors.New("invalid secure verification state")
	}
	if time.Now().Unix()-verifiedAt >= ttl {
		ClearSecureVerification(c, verifiedKey, methodKey)
		return 0, "", false, nil
	}
	method, _ := session.Get(methodKey).(string)
	return verifiedAt, method, true, nil
}

func ClearSecureVerification(c *gin.Context, verifiedKey, methodKey string) {
	if storageKey, ok := secureVerificationStateKey(c); ok {
		secureVerificationStates.Delete(storageKey)
		return
	}

	session := sessions.Default(c)
	session.Delete(verifiedKey)
	session.Delete(methodKey)
	_ = session.Save()
}

func SetPasskeyReady(c *gin.Context, passkeyReadyKey, verifiedKey, methodKey string, ttl int64) (int64, error) {
	now := time.Now().Unix()
	if storageKey, ok := secureVerificationStateKey(c); ok {
		secureVerificationStates.Store(storageKey, SecureVerificationState{
			PasskeyReadyAt: now,
			ExpiresAt:      now + ttl,
		})
		return now, nil
	}

	session := sessions.Default(c)
	session.Set(passkeyReadyKey, now)
	session.Delete(verifiedKey)
	session.Delete(methodKey)
	if err := session.Save(); err != nil {
		return 0, err
	}
	return now, nil
}

func ConsumePasskeyReady(c *gin.Context, passkeyReadyKey string, ttl int64) (bool, error) {
	if storageKey, ok := secureVerificationStateKey(c); ok {
		raw, found := secureVerificationStates.LoadAndDelete(storageKey)
		if !found {
			return false, nil
		}
		state, ok := raw.(SecureVerificationState)
		if !ok || state.PasskeyReadyAt == 0 {
			return false, errors.New("invalid Passkey verification state")
		}
		if time.Now().Unix()-state.PasskeyReadyAt >= ttl {
			return false, nil
		}
		return true, nil
	}

	session := sessions.Default(c)
	readyAtRaw := session.Get(passkeyReadyKey)
	if readyAtRaw == nil {
		return false, nil
	}

	readyAt, ok := readyAtRaw.(int64)
	if !ok {
		session.Delete(passkeyReadyKey)
		_ = session.Save()
		return false, errors.New("invalid Passkey verification state")
	}
	session.Delete(passkeyReadyKey)
	if err := session.Save(); err != nil {
		return false, err
	}
	if time.Now().Unix()-readyAt >= ttl {
		return false, nil
	}
	return true, nil
}

func secureVerificationStateKey(c *gin.Context) (string, bool) {
	auth := strings.TrimSpace(c.GetHeader("Authorization"))
	if auth == "" {
		return "", false
	}
	auth = strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	if auth == "" {
		return "", false
	}
	sum := sha256.Sum256([]byte(auth))
	return hex.EncodeToString(sum[:]), true
}

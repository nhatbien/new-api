package passkey

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	webauthn "github.com/go-webauthn/webauthn/webauthn"
)

var errSessionNotFound = errors.New("Passkey session does not exist or has expired")

const tokenSessionTTL = 10 * time.Minute

type tokenSessionEntry struct {
	payload   string
	expiresAt time.Time
}

var tokenSessions sync.Map
var challengeSessions sync.Map

func SaveSessionData(c *gin.Context, key string, data *webauthn.SessionData) error {
	if storageKey, ok := tokenSessionKey(c, key); ok {
		if data == nil {
			tokenSessions.Delete(storageKey)
			return nil
		}
		payload, err := json.Marshal(data)
		if err != nil {
			return err
		}
		tokenSessions.Store(storageKey, tokenSessionEntry{
			payload:   string(payload),
			expiresAt: time.Now().Add(tokenSessionTTL),
		})
		return nil
	}

	if data != nil && data.Challenge != "" {
		payload, err := json.Marshal(data)
		if err != nil {
			return err
		}
		challengeSessions.Store(challengeSessionKey(key, data.Challenge), tokenSessionEntry{
			payload:   string(payload),
			expiresAt: time.Now().Add(tokenSessionTTL),
		})
		return nil
	}

	session := sessions.Default(c)
	if data == nil {
		session.Delete(key)
		return session.Save()
	}
	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}
	session.Set(key, string(payload))
	return session.Save()
}

func PopSessionData(c *gin.Context, key string) (*webauthn.SessionData, error) {
	if storageKey, ok := tokenSessionKey(c, key); ok {
		raw, found := tokenSessions.LoadAndDelete(storageKey)
		if !found {
			return nil, errSessionNotFound
		}
		entry, ok := raw.(tokenSessionEntry)
		if !ok || time.Now().After(entry.expiresAt) {
			return nil, errSessionNotFound
		}
		var data webauthn.SessionData
		if err := json.Unmarshal([]byte(entry.payload), &data); err != nil {
			return nil, err
		}
		return &data, nil
	}

	if challenge, ok := requestChallenge(c); ok {
		raw, found := challengeSessions.LoadAndDelete(challengeSessionKey(key, challenge))
		if found {
			entry, ok := raw.(tokenSessionEntry)
			if !ok || time.Now().After(entry.expiresAt) {
				return nil, errSessionNotFound
			}
			var data webauthn.SessionData
			if err := json.Unmarshal([]byte(entry.payload), &data); err != nil {
				return nil, err
			}
			return &data, nil
		}
	}

	session := sessions.Default(c)
	raw := session.Get(key)
	if raw == nil {
		return nil, errSessionNotFound
	}
	session.Delete(key)
	_ = session.Save()
	var data webauthn.SessionData
	switch value := raw.(type) {
	case string:
		if err := json.Unmarshal([]byte(value), &data); err != nil {
			return nil, err
		}
	case []byte:
		if err := json.Unmarshal(value, &data); err != nil {
			return nil, err
		}
	default:
		return nil, errors.New("Passkey session format is invalid")
	}
	return &data, nil
}

func tokenSessionKey(c *gin.Context, key string) (string, bool) {
	auth := strings.TrimSpace(c.GetHeader("Authorization"))
	if auth == "" {
		return "", false
	}
	auth = strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	if auth == "" {
		return "", false
	}
	sum := sha256.Sum256([]byte(auth))
	return key + ":" + hex.EncodeToString(sum[:]), true
}

func challengeSessionKey(key string, challenge string) string {
	sum := sha256.Sum256([]byte(challenge))
	return key + ":challenge:" + hex.EncodeToString(sum[:])
}

func requestChallenge(c *gin.Context) (string, bool) {
	raw, err := c.GetRawData()
	if err != nil || len(raw) == 0 {
		return "", false
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(raw))

	var payload struct {
		Response struct {
			ClientDataJSON string `json:"clientDataJSON"`
		} `json:"response"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil || payload.Response.ClientDataJSON == "" {
		return "", false
	}

	clientDataJSON, err := base64.RawURLEncoding.DecodeString(payload.Response.ClientDataJSON)
	if err != nil {
		clientDataJSON, err = base64.StdEncoding.DecodeString(payload.Response.ClientDataJSON)
		if err != nil {
			return "", false
		}
	}

	var clientData struct {
		Challenge string `json:"challenge"`
	}
	if err := json.Unmarshal(clientDataJSON, &clientData); err != nil || clientData.Challenge == "" {
		return "", false
	}
	return clientData.Challenge, true
}

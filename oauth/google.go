package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

func init() {
	Register("google", &GoogleProvider{})
}

type GoogleProvider struct{}

type googleUser struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func (p *GoogleProvider) GetName() string {
	return "Google"
}

func (p *GoogleProvider) IsEnabled() bool {
	return system_setting.GetGoogleSettings().Enabled
}

func (p *GoogleProvider) ExchangeToken(ctx context.Context, code string, c *gin.Context) (*OAuthToken, error) {
	if code == "" {
		return nil, NewOAuthError(i18n.MsgOAuthInvalidCode, nil)
	}

	logger.LogDebug(ctx, "[OAuth-Google] ExchangeToken: code=%s...", code[:min(len(code), 10)])

	settings := system_setting.GetGoogleSettings()
	values := url.Values{}
	values.Set("client_id", settings.ClientId)
	values.Set("client_secret", settings.ClientSecret)
	values.Set("code", code)
	values.Set("grant_type", "authorization_code")
	values.Set("redirect_uri", getGoogleRedirectURI(c))

	req, err := http.NewRequestWithContext(ctx, "POST", "https://oauth2.googleapis.com/token", strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Google] ExchangeToken error: %s", err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "Google"}, err.Error())
	}
	defer res.Body.Close()

	var token OAuthToken
	if err := json.NewDecoder(res.Body).Decode(&token); err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Google] ExchangeToken decode error: %s", err.Error()))
		return nil, err
	}
	if token.AccessToken == "" {
		logger.LogError(ctx, "[OAuth-Google] ExchangeToken failed: empty access token")
		return nil, NewOAuthError(i18n.MsgOAuthTokenFailed, map[string]any{"Provider": "Google"})
	}

	return &token, nil
}

func (p *GoogleProvider) GetUserInfo(ctx context.Context, token *OAuthToken) (*OAuthUser, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	client := http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Google] GetUserInfo error: %s", err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "Google"}, err.Error())
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Google] GetUserInfo failed: status=%d", res.StatusCode))
		return nil, NewOAuthError(i18n.MsgOAuthGetUserErr, map[string]any{"Provider": "Google"})
	}

	var user googleUser
	if err := json.NewDecoder(res.Body).Decode(&user); err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Google] GetUserInfo decode error: %s", err.Error()))
		return nil, err
	}
	if user.Sub == "" {
		logger.LogError(ctx, "[OAuth-Google] GetUserInfo failed: empty sub field")
		return nil, NewOAuthError(i18n.MsgOAuthUserInfoEmpty, map[string]any{"Provider": "Google"})
	}

	username := ""
	if user.Email != "" {
		username = strings.Split(user.Email, "@")[0]
	}

	return &OAuthUser{
		ProviderUserID: user.Sub,
		Username:       username,
		DisplayName:    user.Name,
		Email:          user.Email,
		Extra: map[string]any{
			"email_verified": user.EmailVerified,
			"picture":        user.Picture,
		},
	}, nil
}

func getGoogleRedirectURI(c *gin.Context) string {
	if origin := strings.TrimRight(c.GetHeader("Origin"), "/"); origin != "" {
		return origin + "/oauth/google"
	}
	if referer := c.Request.Referer(); referer != "" {
		if parsed, err := url.Parse(referer); err == nil && parsed.Scheme != "" && parsed.Host != "" {
			return parsed.Scheme + "://" + parsed.Host + "/oauth/google"
		}
	}
	return fmt.Sprintf("%s/oauth/google", system_setting.ServerAddress)
}

func (p *GoogleProvider) IsUserIDTaken(providerUserID string) bool {
	return model.IsProviderUserIdTaken(model.BuiltInOAuthProviderGoogle, providerUserID)
}

func (p *GoogleProvider) FillUserByProviderID(user *model.User, providerUserID string) error {
	foundUser, err := model.GetUserByOAuthBinding(model.BuiltInOAuthProviderGoogle, providerUserID)
	if err != nil {
		return err
	}
	*user = *foundUser
	return nil
}

func (p *GoogleProvider) SetProviderUserID(_ *model.User, _ string) {}

func (p *GoogleProvider) GetProviderPrefix() string {
	return "google_"
}

func (p *GoogleProvider) GetBindingProviderId() int {
	return model.BuiltInOAuthProviderGoogle
}

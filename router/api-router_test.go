package router

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSetApiRouterRegistersWithoutDuplicateRoutePanic(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)

	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("SetApiRouter panicked: %v", r)
		}
	}()

	SetApiRouter(gin.New())
}

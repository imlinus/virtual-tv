package logic

import (
	"path/filepath"
	"strings"
	"time"
	"virtual-tv/src/go/config"
)

type PlayingStatus struct {
	Episode config.Episode `json:"episode"`
	Elapsed float64        `json:"elapsed"`
	Total   float64        `json:"total"`
	Channel string         `json:"channel"`
	NextIn  float64        `json:"next_in"`
}

func GetCurrentPlaying(channelID string) *PlayingStatus {
	channels := config.ReadChannels()
	var channel *config.Channel
	for _, c := range channels {
		if c.ID == channelID {
			channel = &c
			break
		}
	}

	if channel == nil {
		return nil
	}

	library := config.ReadLibrary()
	var pool []config.Episode
	for _, ep := range library.Episodes {
		for _, showPath := range channel.Shows {
			// Normalize paths to use slashes for consistent comparison
			epPath := filepath.ToSlash(ep.Path)
			sURLPath := filepath.ToSlash(showPath)
			if strings.HasPrefix(epPath, sURLPath) {
				pool = append(pool, ep)
				break
			}
		}
	}

	if len(pool) == 0 {
		return nil
	}

	totalDuration := 0.0
	for _, ep := range pool {
		totalDuration += ep.Duration
	}

	if totalDuration == 0 {
		return nil
	}

	// Current time in seconds since epoch
	now := float64(time.Now().UnixNano()) / 1e9
	timeInCycle := mod(now, totalDuration)

	accumulated := 0.0
	for _, ep := range pool {
		if timeInCycle < accumulated+ep.Duration {
			elapsed := timeInCycle - accumulated
			return &PlayingStatus{
				Episode: ep,
				Elapsed: elapsed,
				Total:   ep.Duration,
				Channel: channel.Name,
				NextIn:  ep.Duration - elapsed,
			}
		}
		accumulated += ep.Duration
	}

	return nil
}

func mod(a, b float64) float64 {
	res := a
	for res >= b {
		res -= b
	}
	return res
}

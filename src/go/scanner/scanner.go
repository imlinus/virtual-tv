package scanner

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"virtual-tv/src/go/config"
)

func GetDuration(path string) (float64, error) {
	cmd := exec.Command("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path)
	out, err := cmd.Output()
	if err != nil {
		return 0, err
	}
	durationStr := strings.TrimSpace(string(out))
	return strconv.ParseFloat(durationStr, 64)
}

func FullScan(shows []string) {
	var episodes []config.Episode

	for _, showPath := range shows {
		showName := filepath.Base(showPath)
		filepath.Walk(showPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if !info.IsDir() {
				ext := strings.ToLower(filepath.Ext(path))
				if ext == ".mp4" || ext == ".mkv" || ext == ".avi" || ext == ".mov" || ext == ".webm" {
					duration, err := GetDuration(path)
					if err == nil {
						episodes = append(episodes, config.Episode{
							Path:     path,
							Name:     strings.TrimSuffix(info.Name(), filepath.Ext(info.Name())),
							Show:     showName,
							Duration: duration,
						})
					}
				}
			}
			return nil
		})
	}

	config.WriteLibrary(config.Library{Episodes: episodes})
}

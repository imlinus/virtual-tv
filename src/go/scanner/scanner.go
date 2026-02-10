package scanner

import (
	"embed"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"virtual-tv/src/go/config"
)

//go:embed bin/*
var binFiles embed.FS

func GetFFprobePath() string {
	binName := "ffprobe"
	if runtime.GOOS == "windows" {
		binName = "ffprobe.exe"
	}

	tempDir := filepath.Join(os.TempDir(), "virtual-tv-bin")
	os.MkdirAll(tempDir, 0755)

	targetPath := filepath.Join(tempDir, binName)

	// Only extract if it doesn't exist
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		srcPath := "bin/linux/ffprobe"
		if runtime.GOOS == "windows" {
			srcPath = "bin/windows/ffprobe.exe"
		}

		data, err := binFiles.ReadFile(srcPath)
		if err != nil {
			return "ffprobe" // Fallback to system PATH
		}

		os.WriteFile(targetPath, data, 0755)
	}

	return targetPath
}

func GetDuration(path string) (float64, error) {
	ffprobePath := GetFFprobePath()
	cmd := exec.Command(ffprobePath, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path)
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

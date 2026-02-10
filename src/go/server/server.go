package server

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"virtual-tv/src/go/config"
	"virtual-tv/src/go/logic"
	"virtual-tv/src/go/scanner"
)

func GetLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "localhost"
}

//go:embed all:frontend
var frontendFiles embed.FS

func Start(port int) {
	mux := http.NewServeMux()

	// API: Status
	mux.HandleFunc("/api/status", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		channelID := r.URL.Query().Get("channel")
		if channelID != "" {
			json.NewEncoder(w).Encode(logic.GetCurrentPlaying(channelID))
		} else {
			channels := config.ReadChannels()
			statuses := make(map[string]*logic.PlayingStatus)
			for _, c := range channels {
				statuses[c.ID] = logic.GetCurrentPlaying(c.ID)
			}
			json.NewEncoder(w).Encode(statuses)
		}
	})

	// API: Channels
	mux.HandleFunc("/api/channels", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		if r.Method == "GET" {
			json.NewEncoder(w).Encode(config.ReadChannels())
		} else if r.Method == "POST" {
			var channels []config.Channel
			json.NewDecoder(r.Body).Decode(&channels)
			config.WriteChannels(channels)
			// Trigger scan
			var allShows []string
			for _, c := range channels {
				allShows = append(allShows, c.Shows...)
			}
			go scanner.FullScan(allShows)
			json.NewEncoder(w).Encode(map[string]bool{"success": true})
		}
	})

	// API: Info (for frontend discovery)
	mux.HandleFunc("/api/info", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		ip := GetLocalIP()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ip":   ip,
			"port": 9210,
		})
	})

	// API: Browse
	mux.HandleFunc("/api/browse", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		browsePath := r.URL.Query().Get("path")

		// On Windows, if path is empty, list drives
		if browsePath == "" && os.PathSeparator == '\\' {
			drives := []map[string]string{}
			for _, drive := range "ABCDEFGHIJKLMNOPQRSTUVWXYZ" {
				dPath := string(drive) + ":\\"
				if _, err := os.Stat(dPath); err == nil {
					drives = append(drives, map[string]string{
						"name": dPath,
						"path": dPath,
					})
				}
			}
			json.NewEncoder(w).Encode(map[string]interface{}{
				"current":     "",
				"parent":      "",
				"directories": drives,
			})
			return
		}

		if browsePath == "" {
			browsePath = "/"
		}

		files, err := os.ReadDir(browsePath)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		var dirs []map[string]string
		for _, f := range files {
			if f.IsDir() {
				dirs = append(dirs, map[string]string{
					"name": f.Name(),
					"path": filepath.Join(browsePath, f.Name()),
				})
			}
		}

		parent := filepath.Dir(browsePath)
		if parent == browsePath {
			parent = "" // We are at root
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"current":     browsePath,
			"parent":      parent,
			"directories": dirs,
		})
	})

	// Video streaming with Range support
	mux.HandleFunc("/video", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		filePath := r.URL.Query().Get("path")
		if filePath == "" || !strings.HasPrefix(filePath, "/") {
			http.Error(w, "Invalid path", 400)
			return
		}
		http.ServeFile(w, r, filePath)
	})

	// Static files
	fe, _ := fs.Sub(frontendFiles, "frontend")
	mux.Handle("/", http.FileServer(http.FS(fe)))

	ip := GetLocalIP()
	fmt.Printf("\n📺 Virtual TV is live!\n")
	fmt.Printf("🚀 Local:   http://localhost:%d\n", port)
	fmt.Printf("📡 Network: http://%s:%d\n\n", ip, port)

	http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Range, Content-Type")
	(*w).Header().Set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges")
}

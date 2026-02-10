package main

import (
	_ "embed"
	"fmt"
	"os"
	"virtual-tv/src/go/config"
	"virtual-tv/src/go/scanner"
	"virtual-tv/src/go/server"

	"runtime"

	"github.com/getlantern/systray"
	"github.com/pkg/browser"
)

//go:embed assets/icon.png
var iconPng []byte

//go:embed assets/icon.ico
var iconIco []byte

func main() {
	config.EnsureDataDir()

	fmt.Printf("Virtual TV v%s\n", config.Version)

	// Start server in background
	go server.Start(9210)

	// Run Systray
	systray.Run(onReady, onExit)
}

func onReady() {
	ip := server.GetLocalIP()

	if runtime.GOOS == "windows" {
		systray.SetIcon(iconIco)
	} else {
		systray.SetIcon(iconPng)
	}
	systray.SetTitle("Virtual TV")
	systray.SetTooltip(fmt.Sprintf("Virtual TV v%s (%s)", config.Version, ip))

	systray.AddMenuItem(fmt.Sprintf("Virtual TV v%s", config.Version), "Version").Disable()
	systray.AddMenuItem(fmt.Sprintf("Running at %s", ip), "Local IP address").Disable()
	systray.AddSeparator()
	mOpen := systray.AddMenuItem("Open Virtual TV", "Open the TV player in browser")
	mManage := systray.AddMenuItem("Manage Channels", "Open channel management")
	systray.AddSeparator()
	mScan := systray.AddMenuItem("Full Library Scan", "Scan all media folders")
	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Exit Virtual TV")

	go func() {
		for {
			select {
			case <-mOpen.ClickedCh:
				browser.OpenURL("http://localhost:9210")
			case <-mManage.ClickedCh:
				browser.OpenURL("http://localhost:9210/?manage=true")
			case <-mScan.ClickedCh:
				channels := config.ReadChannels()
				var allShows []string
				for _, c := range channels {
					allShows = append(allShows, c.Shows...)
				}
				scanner.FullScan(allShows)
			case <-mQuit.ClickedCh:
				systray.Quit()
				os.Exit(0)
			}
		}
	}()
}

func onExit() {
	// Clean up here
}

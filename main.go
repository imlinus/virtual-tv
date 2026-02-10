package main

import (
	_ "embed"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"virtual-tv/src/go/config"
	"virtual-tv/src/go/scanner"
	"virtual-tv/src/go/server"

	"runtime"

	"github.com/getlantern/systray"
	"github.com/pkg/browser"
)

//go:embed assets/icon-dot.png
var iconPng []byte

//go:embed assets/icon-dot.ico
var iconIco []byte

func main() {
	config.EnsureDataDir()

	headless := flag.Bool("headless", false, "Run in headless mode (server only, no tray)")
	flag.Parse()

	fmt.Printf("Virtual TV v%s\n", config.Version)

	if *headless {
		fmt.Println("Running in headless mode...")
		go server.Start(9210)

		// Wait for interrupt
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
		<-stop
		fmt.Println("\nShutting down...")
		return
	}

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
				browser.OpenURL(fmt.Sprintf("http://%s:9210", ip))
			case <-mManage.ClickedCh:
				browser.OpenURL(fmt.Sprintf("http://%s:9210/?manage=true", ip))
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

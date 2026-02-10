package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"virtual-tv/src/go/config"
	"virtual-tv/src/go/server"
)

func main() {
	config.EnsureDataDir()

	port := 9210
	fmt.Printf("Virtual TV Standalone CLI\n")
	fmt.Printf("No dependencies required!\n\n")

	go server.Start(port)

	// Wait for interrupt
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	fmt.Println("\nShutting down...")
}

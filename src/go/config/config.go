package config

import (
	"encoding/json"
	"os"
)

type Channel struct {
	ID    string   `json:"id"`
	Name  string   `json:"name"`
	Shows []string `json:"shows"`
}

type Episode struct {
	Path     string  `json:"path"`
	Name     string  `json:"name"`
	Show     string  `json:"show"`
	Duration float64 `json:"duration"`
}

type Library struct {
	Episodes []Episode `json:"episodes"`
}

const Version = "0.2.2"
const DataDir = "data"
const ChannelsFile = "data/channels.json"
const LibraryFile = "data/library.json"

func EnsureDataDir() {
	if _, err := os.Stat(DataDir); os.IsNotExist(err) {
		os.Mkdir(DataDir, 0755)
	}
}

func ReadChannels() []Channel {
	ensureFile(ChannelsFile, "[]")
	data, _ := os.ReadFile(ChannelsFile)
	var channels []Channel
	json.Unmarshal(data, &channels)
	return channels
}

func WriteChannels(channels []Channel) {
	data, _ := json.MarshalIndent(channels, "", "  ")
	os.WriteFile(ChannelsFile, data, 0644)
}

func ReadLibrary() Library {
	ensureFile(LibraryFile, `{"episodes":[]}`)
	data, _ := os.ReadFile(LibraryFile)
	var lib Library
	json.Unmarshal(data, &lib)
	return lib
}

func WriteLibrary(lib Library) {
	data, _ := json.MarshalIndent(lib, "", "  ")
	os.WriteFile(LibraryFile, data, 0644)
}

func ensureFile(path string, defaultVal string) {
	EnsureDataDir()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		os.WriteFile(path, []byte(defaultVal), 0644)
	}
}

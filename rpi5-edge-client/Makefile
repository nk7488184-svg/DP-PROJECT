CXX ?= g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -pthread -march=native -pipe
LDFLAGS = -lcurl -lpthread

TARGET = rpi5_radar_daemon
SRCS = rpi5_radar_daemon.cpp

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET) $(LDFLAGS)

clean:
	rm -f $(TARGET)

install: $(TARGET)
	sudo cp $(TARGET) /usr/local/bin/
	sudo cp roadsentinel-radar.service /etc/systemd/system/
	sudo systemctl daemon-reload
	sudo systemctl enable roadsentinel-radar.service
	@echo "Installed and enabled roadsentinel-radar service."

.PHONY: all clean install

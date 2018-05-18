# Hoverbot #
Hoverbot is an extensible robot platform built from repurposed consumer products and modern software tools. It is intended for use by robot enthusiasts, students, professionals, hackers, makers, and the compulsively curious.

## Setup ##

### Hardware ###
Be sure to collect and connect the following hardware components before you get started. Assembly instructions can be found on the [Hoverbot Hackaday blog](https://hackaday.io/project/158256/log/146069).

* Raspberry Pi 3
* Hoverboard (motors and motor controller)
* Automotive sonar sensors
* DotStar LED strip
* USB webcam
* Portable speaker

### Software ###

The Hoverbot software is a Node.js application, so you'll need to install Node.js on the Raspberry Pi to run it. You'll also need to enable the SPI, serial, and audio interfaces. Follow the [Raspberry Pi configuration instructions](#configure-raspberry-pi) for step-by-step help.

Clone the repo.
```console
pi@raspberrypi:~ $ git clone https://github.com/isabellesimova/Hoverbot.git
```

Install Node.js dependencies and build the webcamera streaming server.
```console
pi@raspberrypi:~ $ cd Hoverbot
pi@raspberrypi:~/Hoverbot $ npm install
pi@raspberrypi:~/Hoverbot $ npm run make
```

### Launch! ###

```console
pi@raspberrypi:~/Hoverbot $ npm start
```

If everything is running smoothly you should see the console output below and have access to the web interface from a browser (connected on the same network) at http://raspi-host-ip:8000.
```console
pi@raspberrypi:~/Hoverbot $ npm start

> Hoverbot@1.0.0 start /home/pi/Hoverbot
> node src/main.js

info: [Server] Writing logs to /home/pi/Hoverbot/hoverbot.log
info: [Server] Listening on 8000
```

### Launch on startup ###

To launch the Hoverbot software on startup, add the following lines to your `/etc/rc.local`. You can optionally include the debug flag to see more detail in the logs.

```shell
cd /home/pi/../path/to/../Hoverbot
sudo npm start debug &
exit 0
```

NOTE: There are a number of other ways to achieve this, so feel free to choose another method.

## Configure Raspberry Pi ##

#### Install Node.js ####
Run the following commands on your Raspberry Pi to install Node.js via package manager. For additional instructions visit the [Node.js installation page](https://nodejs.org/en/download/package-manager/).

```console
pi@raspberrypi:~ $ curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
pi@raspberrypi:~ $ sudo apt-get install -y nodejs
```

#### Enable SPI and Serial Interfaces ####
Open a terminal on your Raspberry Pi and follow these steps:

* sudo raspi-config
* select Interfacting Options
* select SPI
* select yes to enable the spi interface
* select Interfacting Options
* select Serial
* select no to disable the login shell over serial
* select yes to enable the serial port hardware
* select finish (and reboot if asked)

If needed, additional SPI setup instuctions can be found [here](https://www.raspberrypi-spy.co.uk/2014/08/enabling-the-spi-interface-on-the-raspberry-pi/).

#### Adjust webcamera mic volume ####
First make sure your webcamera is plugged into your Pi, then open a terminal on the Pi.

* alsamixer
* F6
* select USB camera
* F4
* up arrow key until the mic level is around 80%
* ESC to exit

This change should persist across reboots.

#### Enable ssh (optional) ####
* sudo raspi-config
* select Interfacting Options
* select SSH
* select yes to enable the SSH server
* ok

#### Select a keyboard layout (optional) ####
* sudo raspi-config
* select Localisation Options
* select Change Keyboard Layout
...

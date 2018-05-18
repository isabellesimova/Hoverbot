# Hoverbot #

## Light Ring ##
There are 6 different animations defined for Hoverbot, each of which accepts an optional configuration. Those configurations are defined as follows:

#### Solid ####
```json
"solid": {
  "brightness": 25,
  "color": "FF00FF"
}
```

#### Flash ####
```json
"flash": {
  "brightness": 25,
  "color": "FF00FF",
  "interval": 500
}
```

#### Blend ####
```json
"blend": {
  "brightness": 25,
  "color": "FF00FF",
  "secondaryColor": "FF00FF",
  "interval": 80
}
```

#### Loop ####
```json
"loop": {
  "brightness": 25,
  "color": "FF00FF",
  "interval": 80,
  "width": 5,
}
```

#### Scan ####
```json
"scan": {
  "brightness": 25,
  "color": "FF00FF",
  "interval": 80,
  "width": 5,
  "startIndex": 0,
  "endIndex": 30
}
```

#### Pulse ####
```json
"pulse": {
  "color": "FF00FF",
  "interval": 80,
  "minBrightness": 0,
  "maxBrightness": 25,
  "step": 1
}
```

#### Off ####
```json
"off": {}
```

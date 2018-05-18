BUILD=./build

${BUILD}/cat_video: cat_video.cpp
	mkdir -p ${BUILD}
	g++ -g -std=c++11 $^ -o $@

.PHONY: all
all: cat_video

.PHONY: clean
clean:
	rm -r ${BUILD}

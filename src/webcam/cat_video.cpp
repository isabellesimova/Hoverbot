// cat_video

#include <cstdlib>
#include <cstring>
#include <cstdio>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <sys/ioctl.h>
#include <sys/time.h>
#include <arpa/inet.h>
#include <poll.h>

#include <iostream>
#include <sstream>
#include <vector>
#include <string>
#include <map>
#include <functional>
#include <memory>
#include <linux/videodev2.h>

using namespace std;

// http://<ip>:<port>/info - json info about connected cameras
// http://<ip>:<port>/video0 - a camera
// http://<ip>:<port>/video1 - another camera
// http://<ip>:<port>/still1 - get a still from video1
// http://<ip>:<port>/video0?width=320&height=240 - set streaming width and height, first reader will define size

class UVC {
    int _fd;
    typedef struct {
        void* data;
        int length;
    } buffer;
    vector<buffer> _buffers;
public:
    UVC() : _fd(-1) {}
    ~UVC()
    {
        stop();
    }

    int fd()
    {
        return _fd;
    }

    int err(const char* s)
    {
        fprintf(stderr,"Error %s:%s\n",s,strerror(errno));
        return errno;
    }

    int stop()
    {
        if (_fd != -1) {
            enum v4l2_buf_type type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
            if (ioctl(_fd, VIDIOC_STREAMOFF, &type) < 0)
                return err("VIDIOC_STREAMOFF");

            // release buffers
            for (int i = 0; i < (int)_buffers.size(); i++)
                munmap(_buffers[i].data,_buffers[i].length);

            close(_fd);
            _fd = -1;
        }
        return 0;
    }

    int next(const function<int(const void* data, int len)>& cb)
    {
        struct v4l2_buffer buf = {0};
        buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
        buf.memory = V4L2_MEMORY_MMAP;
        if (ioctl(_fd, VIDIOC_DQBUF, &buf) != 0)
            return err("VIDIOC_DQBUF");
        int e = cb(_buffers[buf.index].data,buf.bytesused);
        if(ioctl(_fd, VIDIOC_QBUF, &buf) < 0)
            return err("VIDIOC_QBUF");
        return e;
    }

    int start(const char* device, int width = 640, int height = 480)
    {
        _fd = open(device, O_RDWR);
        if (_fd < 0)
            return err("open");

        struct v4l2_capability cap;
        if(ioctl(_fd, VIDIOC_QUERYCAP, &cap) < 0)
            return err("VIDIOC_QUERYCAP");

        if(!(cap.capabilities & V4L2_CAP_VIDEO_CAPTURE))
            return err("V4L2_CAP_VIDEO_CAPTURE");

        struct v4l2_format format;
        memset(&format,0,sizeof(format));
        format.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
        format.fmt.pix.pixelformat = V4L2_PIX_FMT_MJPEG;
        format.fmt.pix.width = width;
        format.fmt.pix.height = height;
        if (ioctl(_fd, VIDIOC_S_FMT, &format) < 0)
            return err("VIDIOC_S_FMT");

        if (ioctl(_fd, VIDIOC_G_FMT, &format) < 0)
            return err("VIDIOC_S_FMT");
        std::cout << "width=" << format.fmt.pix.width << " height=" << format.fmt.pix.height  << std::endl;

        struct v4l2_requestbuffers bufrequest;
        bufrequest.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
        bufrequest.memory = V4L2_MEMORY_MMAP;
        bufrequest.count = 2;
        if (ioctl(_fd, VIDIOC_REQBUFS, &bufrequest) < 0)
            return err("VIDIOC_REQBUFS");

        // Allocate buffers
        for (int i = 0; i < (int)bufrequest.count; i++) {
            struct v4l2_buffer buf = {0};
            buf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
            buf.memory = V4L2_MEMORY_MMAP;
            buf.index = i;
            if(ioctl(_fd, VIDIOC_QUERYBUF, &buf) < 0)
                return err("VIDIOC_QUERYBUF");

            void* data = mmap(NULL,buf.length,PROT_READ|PROT_WRITE,MAP_SHARED,_fd,buf.m.offset);
            if (data == MAP_FAILED)
                return err("mmap");

            if(ioctl(_fd, VIDIOC_QBUF, &buf) < 0)
                return err("VIDIOC_QBUF");
            _buffers.push_back({data,buf.length});
        }

        // stream
        enum v4l2_buf_type type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
        if(ioctl(_fd, VIDIOC_STREAMON, &type) < 0)
            return err("VIDIOC_STREAMON");
        return 0;
    }
};

const char* _hdr =
    "HTTP/1.1 200 OK\r\n"
    "Cache-Control: no-cache, no-store, max-age=0, must-revalidate\r\n"
    "Connection: keep-alive\r\n"
    "Content-Type: multipart/x-mixed-replace;boundary=\"MULTIPART_BOUNDARY\"\r\n"
    "Expires: Thu, Jan 01 1970 00:00:00 GMT\r\n"
    "Pragma: no-cache\r\n"
    "\r\n";

const char* _info_hdr =
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/javascript\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Pragma: no-cache\r\n"
    "\r\n";

const char* _err =
    "HTTP/1.1 404 Not Found\r\n"
    "Content-Type: text/plain\r\n"
    "\r\n"
    "Apologies. Not Found";

static
int send_(int fd, const void* data, int len)
{
    const char* d = (const char*)data;
    while (len) {
        int n = ::send(fd,d,len,MSG_NOSIGNAL);
        if (n <= 0)
            return -1;
        len -= n;
        d += n;
        if (len)
            printf("Truncated ::send %d left\n",len);
    }
    return 0;
}

static
uint64_t millis()
{
    struct timeval t;
    gettimeofday(&t, NULL);
    return t.tv_sec*1000LL + t.tv_usec/1000;
}

static
int send_(int fd, const char* s)
{
    return send_(fd,s,strlen(s));
}

static
int send_mjpeg(int fd, const void* data, int len)
{
    send_(fd,"--MULTIPART_BOUNDARY\r\nContent-Type: image/jpeg\r\nContent-Length: ");
    char s[16];
    sprintf(s,"%d",len);
    send_(fd,s);
    send_(fd,"\r\n\r\n");
    send_(fd,data,len);
    return send_(fd,"\r\n");
}

static
int read_ln(int fd, char* dst, int max_size)
{
    for (int i = 0; i < max_size; i++) {
        if (::recv(fd,dst+i,1,0) != 1)
            return -1;
        if (i && dst[i] == '\n' && dst[i-1] == '\r') {
            dst[--i] = 0;
            return i;
        }
    }
    return -1;
}

vector<string> split(const string &text, const string& sep)
{
    vector<string> tokens;
    ssize_t start = 0, end = 0;
    while ((end = text.find(sep, start)) != string::npos) {
        tokens.push_back(text.substr(start, end - start));
        start = end + sep.length();
    }
    if (start < text.length())
        tokens.push_back(text.substr(start));
    return tokens;
}

class Req {
public:
    map<string,string> params;
    string query;
    string path;
};

static
int recv_http_headers(int fd, Req& req)
{
    struct pollfd pfd = {fd,POLLIN,0};
    if (poll(&pfd, 1, 3000) == 0) {  //
        printf("recv_http_headers timeout\n");  // prevent sleepy http requests from blocking pipeline
        return -1;
    }

    int status = -1;
    for (int i = 0; ; i++) {
        char line[512];
        int len = read_ln(fd,line,sizeof(line));
        if (len == 0)
            return 0;
        if (len < 0)
            return -1;

        if (i == 0) {
            auto p = strchr(line+4,' ');
            if (!p) break;
            p[0] = 0;
            req.path = line+4;
            auto q = split(req.path,"?");
            if (q.size() == 2) {
                req.path = q[0];
                req.query = q[1];
                for (const auto& p : split(req.query,"&")) {
                    auto nv = split(p,"=");
                    req.params[nv[0]] = nv[1];
                }
            }
        } else {
            auto p = strchr(line,':');
            if (!p) break;
            *p = 0;
            //hdr[to_lower(trim(line))] = trim(++p);
        }
    }
    return status;
}

// Send format info as json etc
int info(int fd)
{
    send_(fd,_info_hdr);
    send_(fd,"[\r\n");
    for (int i = 0;;i++)
    {
        string device = "/dev/video" + to_string(i);
        int vfd = open(device.c_str(),O_RDONLY);
        if (vfd <= 0)
            break;
        string s = "\"" +device + "\":[";

        enum v4l2_buf_type type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
        struct v4l2_fmtdesc fmt;
        struct v4l2_frmsizeenum frmsize;
        struct v4l2_frmivalenum frmival;

        fmt.index = 0;
        fmt.type = type;
        while (ioctl(vfd, VIDIOC_ENUM_FMT, &fmt) >= 0) {
            frmsize.pixel_format = fmt.pixelformat;
            frmsize.index = 0;
            char buf[256];
            sprintf(buf,"{\"type\":%d, \"flags\":%d, \"description\":\"%s\", \"pixelformat\":0x%8X, \"sizes\": [",
                    fmt.type,fmt.flags,fmt.description,fmt.pixelformat);
            s += buf;
            while (ioctl(vfd, VIDIOC_ENUM_FRAMESIZES, &frmsize) >= 0) {
                if (frmsize.type == V4L2_FRMSIZE_TYPE_DISCRETE)
                    sprintf(buf,"{\"x\":%d, \"y\":%d},",frmsize.discrete.width,frmsize.discrete.height);
                else if (frmsize.type == V4L2_FRMSIZE_TYPE_STEPWISE)
                    sprintf(buf,"{\"x\":%d, \"y\":%d},",frmsize.stepwise.max_width,frmsize.stepwise.max_height);
                s += buf;
                frmsize.index++;
            }
            fmt.index++;
            s += "]},\r\n";
        }

        close(vfd);
        s += "],\r\n";
        send_(fd,s.c_str());
    }
    send_(fd,"]");
    return 0;
}

static
int intparam(const string& s, int v)
{
    if (!s.empty())
        return atoi(s.c_str());
    return v;
}

// Encapsulation for multiple cameras
class Camera {
public:
    UVC uvc;
    typedef struct  { int fd; int flags; } client;
    vector<client> clients;
    int io()
    {
        return uvc.next([this](const void* data, int len) {
            int j = 0;
            for (int i = 0; i < (int)clients.size(); i++) {
                int fd = clients[i].fd;
                if (send_mjpeg(fd,data,len) < 0 || clients[i].flags) {  // stills are single shot
                    close(fd);
                    continue;
                }
                clients[j++] = clients[i];
            }
            clients.resize(j);
            return 0;
        });
    }
};

static
int not_found(int fd)
{
    send_(fd,_err); // nope
    close(fd);
    return -1;
}

static
int serve(int fd,map<string,unique_ptr<Camera>>& _cameras)
{
    Req req;
    if (recv_http_headers(fd, req) != 0) {
        close(fd);
        return -1;
    }

    string path = req.path;
    printf("GET %s\n",path.c_str());
    if (path == "/info") {
        info(fd);
        close(fd);
        return 0;
    }

    if (path == "/")
        path = "/video0";
    bool video = strncmp(path.c_str(),"/video",6) == 0;
    bool still = strncmp(path.c_str(),"/still",6) == 0;
    if (!video && !still)
        return not_found(fd);

    send_(fd,_hdr);                                 // let the client know there is some thing comming
    path = string("/dev/video") + path.substr(6);   // video 0..9
    if (_cameras.find(path) == _cameras.end())      // Create a new camera if required
    {
        auto* camera = new Camera();
        int width = intparam(req.params["width"],640);
        int height = intparam(req.params["height"],480);
        if (camera->uvc.start(path.c_str(),width,height) == 0) {
            printf("Created %dx%d camera for %s\n",width,height,path.c_str());
            _cameras[path] = unique_ptr<Camera>(camera);
        } else {
            printf("Failed to create %dx%d camera for %s\n",width,height,path.c_str());
            delete camera;
            return not_found(fd);
        }
    }
    _cameras[path]->clients.push_back({fd,still ? 1:0});    // Add http client to camera
    return 0;
}

//  read from network to stdout
int server(int port)
{
    int ss = socket(AF_INET,SOCK_STREAM, 0);
    int sockopt = 1;
    if (setsockopt(ss, SOL_SOCKET, SO_REUSEADDR, &sockopt, sizeof(sockopt)))
        return -1;

    struct sockaddr_in localAddr, remoteAddr;
    localAddr.sin_family = AF_INET;
    localAddr.sin_port = htons(port);
    localAddr.sin_addr.s_addr = INADDR_ANY;
    if (::bind(ss, (struct sockaddr*)&localAddr, sizeof(localAddr)))
        return -1;

    //uint64_t last = millis();
    vector<int> _connecting;
    map<string,unique_ptr<Camera>> _cameras;

    for (;;) {
        vector<struct pollfd> fds;
        fds.push_back({ss, POLLIN, 0});                             // server
        for (int i = 0; i < (int)_connecting.size(); i++)
            fds.push_back({_connecting[i], POLLIN | POLLHUP, 0});   // connecting clients
        for (auto& it : _cameras)
            fds.push_back({it.second->uvc.fd(), POLLIN | POLLHUP | POLLRDNORM, 0});   // uvc camera file descriptors
        poll(&fds[0],fds.size(),-1);

        //last = millis() - last;
        //printf("ms %d\n",last);
        //last = millis();

        // serve inbound clients
        int j = 0;
        int k = 1;
        for (; k <= (int)_connecting.size(); k++) {
            if (fds[k].revents) {
                printf("fds[k].revents %08X\n",fds[k].revents);
                serve(fds[k].fd,_cameras);      // ready
            } else
                _connecting[j++] = fds[k].fd;   // waiting to be served
        }
        _connecting.resize(j);  //

        // handle new connections
        if (fds[0].revents)
        {
            if (listen(ss, 1))
                return -1;
            socklen_t len = sizeof(remoteAddr);
            int fd = accept(ss, (struct sockaddr*) &remoteAddr, &len);
            if (fd != -1) {
                printf("Serving HTTP to %s\n",inet_ntoa(remoteAddr.sin_addr));
                _connecting.push_back(fd);
            }
        }

        // Inbound frame
        // Send image to all attached clients
        // Close camera if there are no clients
        // Camera pipeline takes about 2 seconds to start, might want to timeout instead
        for (; k < (int)fds.size(); k++) {
            if (fds[k].revents) {
                for (auto it = _cameras.cbegin(); it != _cameras.cend();)
                {
                    auto& cam = it->second;
                    if (cam->uvc.fd() == fds[k].fd)
                        cam->io();
                    if (cam->clients.empty()) { // TODO.
                        printf("Closing camera for %s\n",it->first.c_str());
                        _cameras.erase(it++);
                    } else
                        ++it;
                }
            }
        }
    }
    close(ss);
    return 0;
}

static
void usage()
{
    printf("cat_video [-d device]\n");
    exit(1);
}

/*
    Oddly, webcams+V4L2 often produce multiple devices: i.e. /dev/video0, /dev/video1, /dev/video2
    video frames only seem to appear on 1 but is is anybody's guess which one
    not sure who thought that was a good idea
*/

int main(int argc, char *argv[])
{
    int port = 8080;
    for (int i = 1; i < argc; i++) {
        if (argv[i][0] == '-') {
            switch (argv[i][1]) {
                case 'p': port = atoi(argv[++i]);   break;
                default: usage();
            }
        } else
            usage();
    }
    printf("Serving on port %d\n",port);
    return server(port);
}

#!/usr/bin/env python3

import socket
import os
from os import path
import stat
from base64 import b64decode
from urllib.parse import unquote_plus
from urllib.parse import urlparse
from typing import Union, Tuple, Dict

from threading import Thread

BUFF_SIZE = 8192

# Equivalent to CRLF, named NEWLINE for clarity
NEWLINE = "\r\n"

HTTP_REQ_HEADER_END = (NEWLINE + NEWLINE).encode("utf-8")

# METHOD_NOT_ALLOWED = 'HTTP/1.1 405  METHOD NOT ALLOWED{}Allow: GET, HEAD, POST {}Connection: close{}{}'.format(NEWLINE, NEWLINE, NEWLINE, NEWLINE)
# OK = 'HTTP/1.1 200 OK{}{}{}'.format(NEWLINE, NEWLINE, NEWLINE)
# NOT_FOUND = 'HTTP/1.1 404 NOT FOUND{}Connection: close{}{}'.format(NEWLINE, NEWLINE, NEWLINE)
# FORBIDDEN = 'HTTP/1.1 403 FORBIDDEN{}Connection: close{}{}'.format(NEWLINE, NEWLINE, NEWLINE)
# MOVED_PERMANENTLY = 'HTTP/1.1 301 MOVED PERMANENTLY{}Location:  https://www.cs.umn.edu/{}Connection: close{}{}'.format(NEWLINE, NEWLINE, NEWLINE, NEWLINE)

# This class is 100% built for you.
# YOU WILL NEED TO READ (at least) THE DOCSTRINGS AND FUNCTION NAMES HERE!
class Request:
    """Holds the data which a client sends in a request

    `method` is a string of the HTTP method which the client's request was in.
    For example: GET or POST.

    `headers` is a dictionary of all lowercase key to value pairs. For Example:
      - 'accept': 'text/html'
      - 'accept-charset': 'UTF-8'

    `content` is a possibly empty string of whatever content was included in the
    client's request.
    """

    def __init__(self, start_line: str, headers: Dict[str, str], content: str):
        self.method, self.path, *_ = start_line.split()
        # remove leading "/" from the path (relative URL)
        self.path = self.path[1:]
        self.headers = headers
        self.content = content

# provided complete
def recv_until_crlfs(sock) -> Request:
    def to_tuple(kvstr: str) -> Tuple[str, str]:
        k, v = kvstr.split(":", 1)
        # we could have capitalized header or all lowercase, normalize it
        # so we can do a proper lookup
        return (k.lower(), v)

    header_data = b""
    content = b""
    content_bytes_read = 0
    while True:
        data = sock.recv(BUFF_SIZE)
        if not data:
            break
        # Request headers end with two CRLFs
        if HTTP_REQ_HEADER_END in data:
            header_end_idx = data.find(HTTP_REQ_HEADER_END)
            header_data += data[:header_end_idx]
            # How much content did we prematurely recieve from the client
            content_bytes_read = max(0, len(data) - header_end_idx - 4)
            content += data[header_end_idx + 4 :]
            break
        header_data += data
    # read the rest of the content that we need to based on content-length
    headers = header_data.decode("utf-8")
    header_list = headers.split(NEWLINE)
    header_kvs = dict(map(to_tuple, header_list[1:]))
    if content_bytes_read != 0:
        if "content-length" not in header_kvs:
            # No content length header... keep reading until end
            while True:
                data = sock.recv(BUFF_SIZE)
                if not data:
                    break
                content += data
        else:
            content_len = int(header_kvs["content-length"])
            to_recv = max(0, content_len - content_bytes_read)
            content += sock.recv(to_recv)
    return Request(header_list[0], header_kvs, content.decode("utf-8"))


# Let's define some functions to help us deal with files, since reading them
# and returning their data is going to be a very common operation.
# Both functions are provided complete and correct.

def get_file_contents(file_name: str) -> str:
    """Returns the text content of `file_name`"""
    with open(file_name, "r") as f:
        return f.read()


def get_file_binary_contents(file_name: str) -> bytes:
    """Returns the binary content of `file_name`"""
    with open(file_name, "rb") as f:
        return f.read()

# USE: 
def has_permission_other(file_name):
    """Returns `True` if the `file_name` has read permission on other group

    In Unix based architectures, permissions are divided into three groups:

    1. Owner
    2. Group
    3. Other

    When someone requests a file, we want to verify that we've allowed
    non-owners (and non group) people to read it before sending the data over.
    """
    stmode = os.stat(file_name).st_mode
    return getattr(stat, "S_IROTH") & stmode > 0


def file_exists(file_name: str) -> bool:
    """Returns `True` if `file_name` exists, this is just a wrapper for the
    os.path.exists function so that it's more visible"""
    return os.path.exists(file_name)


# Some files should be read in plain text, whereas others should be read
# as binary. To maintain a mapping from file types to their expected form, we
# have a `set` that maintains membership of file extensions expected in binary.
# We've defined a starting point for this set, which you may add to as
# necessary.
# TODO: Finish this set with all relevant files types that should be read in
# binary
# Done
binary_type_files = set(["jpg", "jpeg", "png", "mp3"])


def should_return_binary(file_extension: str) -> bool:
    """
    Returns `True` if the file with `file_extension` should be sent back as
    binary.
    """
    return file_extension in binary_type_files


# For a client to know what sort of file you're returning, it must have what's
# called a MIME type. We will maintain a `dictionary` mapping file extensions
# to their MIME type so that we may easily access the correct type when
# responding to requests.
# TODO: Finish this dictionary with all required MIME types
MimeType = str
Response = bytes
mime_types: Dict[str, MimeType] = {
    "html": "text/html",
    "css": "text/css",
    "js": "text/javascript",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "mp3": "audio/mpeg"
}


def get_file_mime_type(file_extension: str) -> MimeType:
    """
    Returns the MIME type for `file_extension` if present, otherwise
    returns the MIME type for plain text.
    """
    if file_extension not in mime_types:
        return "text/plain"
    return mime_types[file_extension]


# TODO: This is not completely built -- you will need to finish it, or replace it with comparable behavior.
class ResponseBuilder:
    """
    This class is here for your use if you want to use it. This follows
    the builder design pattern to assist you in forming a response. An
    example of its use is in the `method_not_allowed` function.
    """

    def __init__(self):
        """
        Initialize the parts of a response to nothing (I.E. by default -- no response)
        """
        self.headers = []
        self.status = None
        self.content = None

    def add_header(self, header_key: str, header_value: Union[str, int]) -> None:
        """Adds a new header to the response"""
        self.headers.append(f"{header_key}: {header_value}")

    def set_status(self, status_code: Union[str, int], status_message: str) -> None:
        """Sets the status of the response"""
        self.status = f"HTTP/1.1 {status_code} {status_message}"

    def set_content(self, content: Union[str, bytes]) -> None:
        """Sets `self.content` to the bytes of the content"""
        if isinstance(content, (bytes, bytearray)):
            self.content = content
        else:
            self.content = content#.encode("utf-8")

    def build(self) -> bytes:
        """
        Returns the utf-8 bytes of the response.

        Uses the `self.status`, `self.headers`, and `self.content` to form
        an HTTP response in valid formatting per w3c specifications, which
        can be seen here:
          https://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html

        Where CRLF is our `NEWLINE` constant.
        """
        # TODO: this function
        myresponse = "{}{}".format(self.status, NEWLINE)
        for myheader in self.headers:
            myresponse += "{}{}".format(myheader, NEWLINE)
        myresponse += "{}".format(NEWLINE)
        if (self.content != None):
            myresponse += "{}".format(self.content)
        return myresponse.encode('utf-8')


class HTTPServer:
    """
    Our actual HTTP server which will service GET, POST, and HEAD requests.
    """

    def __init__(self, host="localhost", port=9001, directory="."):
        print(f"Server started. Listening at http://{host}:{port}/")
        self.host = host
        self.port = port
        self.working_dir = directory

        self.setup_socket()
        self.accept()

        self.teardown_socket()

    def setup_socket(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind((self.host, self.port))
        self.sock.listen(128)

    def teardown_socket(self):
        if self.sock:
            self.sock.shutdown()
            self.sock.close()

    def accept(self):
        while True:
            (client, address) = self.sock.accept()
            th = Thread(target=self.accept_request, args=(client, address))
            th.start()

    def accept_request(self, client_sock, client_addr):
        req = recv_until_crlfs(client_sock)

        response = self.process_response(req)
        client_sock.send(response)

        # clean up
        client_sock.shutdown(1)
        client_sock.close()

    def process_response(self, request: Request) -> bytes:
        if request.method == "GET":
            return self.get_request(request)
        if request.method == "POST":
            return self.post_request(request)
        if request.method == "HEAD":
            return self.head_request(request)
        return self.method_not_allowed()

    # TODO: Write the response to a GET request
    def get_request(self, request: Request) -> Response:
        """Responds to a GET request with the associated bytes.

        If the request is to redirect to a url (first item in URI),
        responds with a redirect request with HTTP 307 (Temporary Redirect)
        status code and a location header

        If the request is to a file that does not exist, returns
        a `NOT FOUND` error.

        If the request is to a file that does not have the `other`
        read permission, returns a `FORBIDDEN` error.

        Otherwise, we must read the requested file's content, either
        in binary or text depending on `should_return_binary` and
        send it back with a status set and appropriate mime type
        depending on `get_file_mime_type`.
        """
        # Read Request first
        #   Check what Request is:
        #       If redirect, respond with 307 Temporary redirect
        #       If does not exist, call resource_not_found()
        #       iF Forbidden, call resource forbidden()
        

        # Example of a Redirect Link URL from GET: 
        # “localhost:9001/redirect?myquery=Pewdiepie&queryplace=Youtube”
        #

        # Example of request sent: 
        # GET /redirect HTTP/1.1
        # Host: localhost:9001
        # Content-Type: application/x-www-form-urlencoded
        # Content-Length: 97
        # 
        # myquery=Pewdiepie&queryplace=Youtube

        # Then, the Request object produced from that should look like this:
        # self.method = "GET"
        # self.path = "redirect"    # Note that leading / is taken out
        # self.headers = {"Content-Type" : "app...", "Content-Length" : "97"}  
        #           Note it's a dictionary of str to str
        # self.content = "myquery=Pewdiepie&queryplace=Youtube"
        # if (request.content != b""):
        #     return None
        # mycontent = request.content

        # USE UNQUOTE_PLUS
        # print("Request Method:", request.method)
        # print("Request Path:", request.path)
        # parsedpath = urlparse(unquote_plus(request.path))
        # print("Path Parsed:", parsedpath.path, parsedpath.query)
        # print("Request Headers:", request.headers)
        # print("Request Content:", request.content)

        myparse = urlparse(request.path)
        # 307 Temporary Redirect
        if (myparse.path == "redirect"):    # if redirect basically, other Get Requests don't have content
            return self.temp_redirect(myparse.query)
        # 404 Not found
        if ((not file_exists(request.path))):
            return self.resource_not_found()
        if ((not has_permission_other(request.path))):
            return self.resource_forbidden()
        
        #Now we can provide an OK
        #content-type for ok, content-length is 
        #post: content-type:
        myresponse = self.okay_response(request)
        return myresponse

    # TODO: Write the response to a POST request
    def post_request(self, request: Request) -> Response:
        """
        Responds to a POST request with an HTML page with keys and values
        echoed per the requirements writeup.

        A post request through the form will send over key value pairs
        through "x-www-form-urlencoded" format. You may learn more about
        that here:
          https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST
        You /do not/ need to check the POST request's Content-Type to
        verify the encoding used (although a real server would).

        From the request, each key and value should be extracted. A row in
        the HTML table will hold a single key-value pair. With the key having
        the first column and the value the second. If a request sent n
        key-value pairs, the HTML page returned should contain a table like:

        | key 1 | val 1 |
        | key 2 | val 2 |
        | ...   | ...   |
        | key n | val n |

        Care should be taken in forming values with spaces. Since the request
        was urlencoded, it will need to be decoded using
        `urllib.parse.unquote_plus`.
        """
        # print(request)
        # print("Request Method:", request.method)
        # print("Request Path:", request.path)
        # parsedpath = urlparse(unquote_plus(request.path))
        # print("Path Parsed:", parsedpath.path, parsedpath.query)
        # print("Request Headers:", request.headers)
        # print("Request Content:", request.content)

        # Parse Request Content.
        #   (1) Split by &
        #   (2) For Each in list, do unquote_plus
        #   (3) For each in list, split by equal to get key and value, then place those in html to be fed
        myhtml = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>MyForm.html Response</title>'
        myhtml += '<style>table {border-collapse: collapse;} table, th, td {border: 1px solid black;}</style></head>'
        myhtml += '<body><h1>MyForm.html Response</h1><table><tbody>'
        myqueries = request.content.split("&")
        keyvalpair = None
        mykey, myval = None, None
        for certquery in myqueries:
            keyvalpair = certquery.split("=")
            mykey, myval = unquote_plus(keyvalpair[0]), unquote_plus(keyvalpair[1])
            myhtml += '<tr><th>'+mykey+'</th><td>'+myval+'</td></tr>'
        myhtml += '</tbody></table></body></html>'
        # remember to close </tbody></table> </body></html>
        # "https://www-users.cselabs.umn.edu/%7Ecuixx327/a2.php"
        # "http://localhost:9001/MyForm.html"
        builder = ResponseBuilder()
        builder.set_status("200", "OK")
        builder.add_header("Connection", "close")
        builder.add_header("Content-Type", "text/html")
        builder.add_header("Content-Length", str(len(myhtml)))
        builder.set_content(myhtml)
        return builder.build()

    def head_request(self, request: Request) -> Response:
        """
        Responds to a HEAD request with the exact same requirements as a GET
        request, but should not contain any content.

        HINT: you can _remove_ content from a ResponseBuilder...
        """
        # builder = ResponseBuilder()
        # builder.set_status("200", "OK")
        # allowed = ", ".join(["GET", "POST", "HEAD"])
        # builder.add_header("Allow", allowed)
        # builder.add_header("Connection", "close")
        myparse = urlparse(request.path)
        # 307 Temporary Redirect
        if (myparse.path == "redirect"):    # if redirect basically, other Get Requests don't have content
            return self.temp_redirect(myparse.query)
        # 404 Not found
        if ((not file_exists(request.path))):
            return self.resource_not_found()
        if ((not has_permission_other(request.path))):
            return self.resource_forbidden()
        builder = ResponseBuilder()
        builder.set_status("200", "OK")
        mydirs = ""
        myfile = ""
        if ('/' in request.path):
            mydirs = request.path.split("/")
            myfile = mydirs[-1]
        else:
            myfile = request.path
        myexten = myfile.split(".")[-1]
        contentsize = (os.path.getsize("./"+request.path))
        #print(contentsize)
        mymime = get_file_mime_type(myexten)+"; charset=UTF-8"
        builder.add_header("Content-Type", mymime)
        #builder.add_header("Content-Length", contentsize)
        builder.add_header("Connection", "close")
        return builder.build()

    def method_not_allowed(self) -> Response:
        """
        Returns 405 not allowed status and gives allowed methods.

        TODO: If (and only if)  you are not going to complete the `ResponseBuilder`,
        This must be rewritten.
        """
        builder = ResponseBuilder()
        builder.set_status("405", "METHOD NOT ALLOWED")
        allowed = ", ".join(["GET", "POST", "HEAD"])
        builder.add_header("Allow", allowed)
        builder.add_header("Connection", "close")
        return builder.build()

    # TODO: Write 404 error
    def resource_not_found(self) -> Response:
        """
        Returns 404 not found status and sends back our 404.html page.
        """
        builder = ResponseBuilder()
        builder.set_status("404", "NOT FOUND")
        builder.add_header("Connection", "close")
        mycon = ""
        mycon = get_file_contents("404.html")
        builder.set_content(mycon)
        return builder.build()


    # 200 OK
    # 301 MOVED
    # 302 FOUND
    # 304 MODIFIED
    # 403 FORBIDDEN
    # 404 NOT FOUND
    # 405 NO METHOD ALLOWED
    # 500 INTERNAL SERVER ERROR
    
    # Tarik's addition. Writing 403 Error
    def resource_forbidden(self) -> Response:
        builder = ResponseBuilder()
        builder.set_status("403", "FORBIDDEN")
        builder.add_header("Connection", "close")
        mycon = ""
        mycon = get_file_contents("403.html")
        builder.set_content(mycon)
        return builder.build()
    
    # Tarik's addition. Writing 307 Response
    def temp_redirect(self, queryStr : str) -> Response:
        builder = ResponseBuilder()
        builder.set_status("307", "Temporary Redirect")
        myloc = "https://www."#"https://www.youtube.com/results?search_query=hellowhats"
        #Parse myRequest.path
        # use url.parse
        myQueries = queryStr.split("&")
        searchTerm = unquote_plus(myQueries[0].split("=")[1])
        searchPlace = unquote_plus(myQueries[1].split("=")[1])
        if (searchPlace=="Youtube"):
            myloc += "youtube.com/results?search_query="+searchTerm
        else:
            myloc += "google.com/search?q="+searchTerm
        #Location url
        builder.add_header("Location", myloc)
        builder.add_header("Connection", "close")
        return builder.build()
    
    def okay_response(self, myrequest : Request) -> Response:
        builder = ResponseBuilder()
        builder.set_status("200", "OK")
        mydirs = ""
        myfile = ""
        if ('/' in myrequest.path):
            mydirs = myrequest.path.split("/")
            myfile = mydirs[-1]
        else:
            myfile = myrequest.path
        myexten = myfile.split(".")[-1]
        
        contentsize = (os.path.getsize("./"+myrequest.path))
        #print(contentsize)
        mymime = get_file_mime_type(myexten)+"; charset=UTF-8"
        builder.add_header("Content-Type", mymime)
        #builder.add_header("Content-Length", contentsize)
        builder.add_header("Connection", "close")
        #print(mymime)
        mycon = ""
        if (should_return_binary(myexten)):
            mycon = get_file_binary_contents(myrequest.path)
            mybuild = builder.build()
            return (mybuild + mycon)
        else:
            mycon = get_file_contents(myrequest.path)
            builder.set_content(mycon)
        return builder.build()

if __name__ == "__main__":
    HTTPServer()
 
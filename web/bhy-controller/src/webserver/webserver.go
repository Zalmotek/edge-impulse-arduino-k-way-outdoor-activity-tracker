package webserver

import (
	//"arduino/bhy/static"
	"fmt"
	"log"
	"net/http"

	"github.com/pkg/browser"
)

func errCheck(e error) {
	if e != nil {
		log.Fatal(e)
	}
}

func startServer() {
	fmt.Printf("Starting server at port 8000\n")
	fmt.Printf("Visit webpage at address http://localhost:8000/index.html\n")

	//fileServer := http.FileServer(http.FS(static.Content))
	//http.Handle("/", fileServer)

      	static := http.FileServer(http.Dir("./static"))
	http.Handle("/",static)
	http.ListenAndServe(":8000", nil)
}

func Execute() {
	go startServer()

	e := browser.OpenURL("http://localhost:8000/index.html")

	errCheck(e)

	select {}
}

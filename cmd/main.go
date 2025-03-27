package main

import (
	"log"
	"net/http"
	"text/template"
	"time"
)

const addr = "localhost:8080"

func main() {
	log.Printf("listening on ws://%v", addr)

	hub := newHub()
	go hub.run()

	fs := http.FileServer(http.Dir("./web/dist"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl, err := template.ParseFiles("./web/dist/index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		data := struct {
			Version string
		}{
			Version: time.Now().Format("20060102150405"),
		}
		w.Header().Set("Content-Type", "text/html")
		tmpl.Execute(w, data)
	})

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	err := http.ListenAndServe(addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

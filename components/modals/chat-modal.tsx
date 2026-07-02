"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Bot, User, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Message {
  id: number
  sender: "user" | "bot"
  text: string
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "bot", text: "Hello! How can I assist you today regarding Trustvox?" },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (inputMessage.trim() === "") return

    const newUserMessage: Message = {
      id: messages.length + 1,
      sender: "user",
      text: inputMessage.trim(),
    }
    setMessages((prevMessages) => [...prevMessages, newUserMessage])
    setInputMessage("")

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: messages.length + 2,
        sender: "bot",
        text: `I received your message: "${newUserMessage.text}". How else can I help?`,
      }
      setMessages((prevMessages) => [...prevMessages, botResponse])
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[500px] flex flex-col bg-slate-800/90 border-slate-600/50 backdrop-blur-sm text-slate-100">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center">
            <Bot className="w-6 h-6 mr-2 text-teal-400" />
            <DialogTitle className="text-slate-100 text-xl">Trustvox AI Assistant</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "bot" && (
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center mr-2 flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-700 text-slate-100 rounded-bl-none"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
              {msg.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center ml-2 flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="flex p-4 border-t border-slate-700">
          <Input
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 mr-2 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500"
          />
          <Button onClick={handleSendMessage} className="bg-teal-500 hover:bg-teal-600 text-white">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

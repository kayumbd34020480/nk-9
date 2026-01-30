"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Send, MessageCircle, User } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900 mb-2">
            Contact Us
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            If you have any questions, suggestions, or require support, feel free to reach out to us.
            We are always happy to assist you and value your feedback.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="space-y-4">
          {/* Email */}
          <Card className="border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Mail className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Email</p>
                <a 
                  href="mailto:kayumislam1000@gmail.com" 
                  className="text-base font-semibold text-gray-900 hover:text-emerald-600 transition-colors break-all"
                >
                  kayumislam1000@gmail.com
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Phone */}
          <Card className="border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Phone className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <a 
                  href="tel:+8801845599830" 
                  className="text-base font-semibold text-gray-900 hover:text-emerald-600 transition-colors"
                >
                  +880 1845 599 830
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card className="border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Telegram</p>
                <a 
                  href="https://t.me/+8801834020480" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-gray-900 hover:text-blue-500 transition-colors"
                >
                  +880 1834 020 480
                </a>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">WhatsApp</p>
                <a 
                  href="https://wa.me/8801330603685" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-gray-900 hover:text-green-600 transition-colors"
                >
                  +880 1330 603 685
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p className="text-base font-semibold text-gray-900">
                  Thakurgaon, Bangladesh
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Developer */}
          <Card className="border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Developer</p>
                <p className="text-base font-semibold text-gray-900">
                  Kayum
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Message */}
        <div className="mt-8 text-center">
          <Card className="border border-emerald-200 bg-emerald-50">
            <CardContent className="p-6">
              <p className="text-emerald-800 font-medium">
                Thank you for using NK TECH ZONE.
              </p>
              <p className="text-emerald-600 text-sm mt-1">
                Your feedback and support mean a lot to us.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

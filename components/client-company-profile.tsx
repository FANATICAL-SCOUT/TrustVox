"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Mail, Users, Globe, Info } from "lucide-react"

interface ClientCompanyProfileProps {
  companyData: {
    contactName: string
    position: string
    companyName: string
    industry: string
    companySize: string
    website: string
    description: string
    address: string
    city: string
    country: string
    phone: string
    contactEmail: string
  } | null
}

export default function ClientCompanyProfile({ companyData }: ClientCompanyProfileProps) {
  if (!companyData) {
    return null // Or a loading skeleton
  }

  return (
    <Card className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-slate-100 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-purple-400" />
          {companyData.companyName || "Your Company Profile"}
        </CardTitle>
        <CardDescription className="text-slate-300">
          {companyData.description || "Manage your business details and campaigns."}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="flex items-center text-slate-200">
          <Users className="w-4 h-4 mr-2 text-teal-400" />
          <span className="font-medium">{companyData.contactName}</span>
          {companyData.position && <span className="ml-1 text-slate-400">({companyData.position})</span>}
        </div>
        <div className="flex items-center text-slate-200">
          <Mail className="w-4 h-4 mr-2 text-teal-400" />
          <span className="font-medium">{companyData.contactEmail}</span>
        </div>
        {companyData.industry && (
          <div className="flex items-center text-slate-200">
            <Info className="w-4 h-4 mr-2 text-teal-400" />
            <span className="font-medium">{companyData.industry}</span>
            {companyData.companySize && (
              <span className="ml-1 text-slate-400">({companyData.companySize} employees)</span>
            )}
          </div>
        )}
        {companyData.website && (
          <div className="flex items-center text-slate-200">
            <Globe className="w-4 h-4 mr-2 text-teal-400" />
            <a
              href={companyData.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline text-blue-400"
            >
              {companyData.website.replace(/(^\w+:|^)\/\//, "")}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

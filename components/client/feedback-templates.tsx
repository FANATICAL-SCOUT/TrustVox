"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Copy, FileText, Sparkles } from "lucide-react"

interface FeedbackTemplate {
  id: number
  name: string
  category: string
  type: "predefined" | "custom"
  questions: string[]
  description: string
  isActive: boolean
  usageCount: number
}

export default function FeedbackTemplates() {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([
    {
      id: 1,
      name: "Product Experience Survey",
      category: "Technology",
      type: "predefined",
      questions: [
        "How would you rate the overall quality of our product?",
        "What features do you find most valuable?",
        "What improvements would you suggest?",
        "Would you recommend this product to others?",
      ],
      description: "Comprehensive product feedback template",
      isActive: true,
      usageCount: 245,
    },
    {
      id: 2,
      name: "Service Quality Assessment",
      category: "Service",
      type: "predefined",
      questions: [
        "How satisfied are you with our customer service?",
        "Was your issue resolved in a timely manner?",
        "How professional was our support team?",
        "Any additional comments or suggestions?",
      ],
      description: "Customer service evaluation template",
      isActive: true,
      usageCount: 189,
    },
    {
      id: 3,
      name: "Custom Food Review",
      category: "Food & Beverage",
      type: "custom",
      questions: [
        "How was the taste and flavor?",
        "Rate the presentation and packaging",
        "Value for money assessment",
        "Delivery experience rating",
      ],
      description: "Custom template for food delivery service",
      isActive: true,
      usageCount: 67,
    },
  ])

  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FeedbackTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "",
    description: "",
    questions: [""],
  })

  const predefinedCategories = [
    "Technology",
    "Food & Beverage",
    "Entertainment",
    "Travel",
    "Fashion",
    "Health & Fitness",
    "Education",
    "Finance",
    "Service",
    "Retail",
  ]

  const addQuestion = () => {
    setNewTemplate({
      ...newTemplate,
      questions: [...newTemplate.questions, ""],
    })
  }

  const updateQuestion = (index: number, value: string) => {
    const updatedQuestions = [...newTemplate.questions]
    updatedQuestions[index] = value
    setNewTemplate({
      ...newTemplate,
      questions: updatedQuestions,
    })
  }

  const removeQuestion = (index: number) => {
    if (newTemplate.questions.length > 1) {
      const updatedQuestions = newTemplate.questions.filter((_, i) => i !== index)
      setNewTemplate({
        ...newTemplate,
        questions: updatedQuestions,
      })
    }
  }

  const handleCreateTemplate = () => {
    const template: FeedbackTemplate = {
      id: Date.now(),
      name: newTemplate.name,
      category: newTemplate.category,
      type: "custom",
      questions: newTemplate.questions.filter((q) => q.trim() !== ""),
      description: newTemplate.description,
      isActive: true,
      usageCount: 0,
    }

    setTemplates([...templates, template])
    setNewTemplate({
      name: "",
      category: "",
      description: "",
      questions: [""],
    })
    setIsCreating(false)
  }

  const toggleTemplateStatus = (id: number) => {
    setTemplates(
      templates.map((template) => (template.id === id ? { ...template, isActive: !template.isActive } : template)),
    )
  }

  const duplicateTemplate = (template: FeedbackTemplate) => {
    const duplicated: FeedbackTemplate = {
      ...template,
      id: Date.now(),
      name: `${template.name} (Copy)`,
      type: "custom",
      usageCount: 0,
    }
    setTemplates([...templates, duplicated])
  }

  const deleteTemplate = (id: number) => {
    setTemplates(templates.filter((template) => template.id !== id))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Feedback Templates</h1>
          <p className="text-slate-300 mt-2">Create and manage feedback collection templates</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-slate-800/50 border border-slate-600">
          <TabsTrigger value="all" className="data-[state=active]:bg-slate-700">
            All Templates
          </TabsTrigger>
          <TabsTrigger value="predefined" className="data-[state=active]:bg-slate-700">
            Predefined
          </TabsTrigger>
          <TabsTrigger value="custom" className="data-[state=active]:bg-slate-700">
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onToggleStatus={toggleTemplateStatus}
                onDuplicate={duplicateTemplate}
                onDelete={deleteTemplate}
                onEdit={setEditingTemplate}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predefined" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates
              .filter((t) => t.type === "predefined")
              .map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onToggleStatus={toggleTemplateStatus}
                  onDuplicate={duplicateTemplate}
                  onDelete={deleteTemplate}
                  onEdit={setEditingTemplate}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates
              .filter((t) => t.type === "custom")
              .map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onToggleStatus={toggleTemplateStatus}
                  onDuplicate={duplicateTemplate}
                  onDelete={deleteTemplate}
                  onEdit={setEditingTemplate}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Template Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100">Create New Template</CardTitle>
              <CardDescription className="text-slate-300">Design a custom feedback collection template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name" className="text-slate-200 font-medium">
                    Template Name *
                  </Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Product Review Template"
                    className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500"
                  />
                </div>
                <div>
                  <Label htmlFor="template-category" className="text-slate-200 font-medium">
                    Category *
                  </Label>
                  <select
                    id="template-category"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full mt-1 p-3 bg-slate-800/50 border border-slate-600 rounded-md text-slate-100 focus:border-teal-500"
                  >
                    <option value="">Select category</option>
                    {predefinedCategories.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-800">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-description" className="text-slate-200 font-medium">
                  Description
                </Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description of this template's purpose"
                  rows={2}
                  className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-slate-200 font-medium">Questions *</Label>
                  <Button
                    type="button"
                    onClick={addQuestion}
                    size="sm"
                    variant="outline"
                    className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Question
                  </Button>
                </div>
                <div className="space-y-3">
                  {newTemplate.questions.map((question, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={question}
                        onChange={(e) => updateQuestion(index, e.target.value)}
                        placeholder={`Question ${index + 1}`}
                        className="flex-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500"
                      />
                      {newTemplate.questions.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          size="sm"
                          variant="outline"
                          className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setIsCreating(false)}
                  variant="outline"
                  className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.name || !newTemplate.category || newTemplate.questions.every((q) => !q.trim())}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                >
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface TemplateCardProps {
  template: FeedbackTemplate
  onToggleStatus: (id: number) => void
  onDuplicate: (template: FeedbackTemplate) => void
  onDelete: (id: number) => void
  onEdit: (template: FeedbackTemplate) => void
}

function TemplateCard({ template, onToggleStatus, onDuplicate, onDelete, onEdit }: TemplateCardProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-600/30 hover:border-slate-500/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg text-slate-100 truncate">{template.name}</CardTitle>
            <CardDescription className="text-slate-300 font-medium">{template.category}</CardDescription>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <Badge
              variant={template.type === "predefined" ? "default" : "secondary"}
              className={
                template.type === "predefined"
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
              }
            >
              {template.type === "predefined" ? (
                <Sparkles className="w-3 h-3 mr-1" />
              ) : (
                <FileText className="w-3 h-3 mr-1" />
              )}
              {template.type}
            </Badge>
            <Badge
              variant={template.isActive ? "default" : "secondary"}
              className={
                template.isActive
                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                  : "bg-slate-500/20 text-slate-400 border-slate-500/30"
              }
            >
              {template.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-slate-200 mb-4 text-sm leading-relaxed line-clamp-2">{template.description}</p>

        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-400 font-medium">Questions ({template.questions.length}):</p>
          <div className="space-y-1">
            {template.questions.slice(0, 2).map((question, index) => (
              <p key={index} className="text-xs text-slate-300 truncate">
                {index + 1}. {question}
              </p>
            ))}
            {template.questions.length > 2 && (
              <p className="text-xs text-slate-400">+{template.questions.length - 2} more questions</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-slate-400">
            <span className="font-medium">Used {template.usageCount} times</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={() => onToggleStatus(template.id)}
              variant="outline"
              className={
                template.isActive
                  ? "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  : "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
              }
            >
              {template.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button
              size="sm"
              onClick={() => onDuplicate(template)}
              variant="outline"
              className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={() => onEdit(template)}
              variant="outline"
              className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
            >
              <Edit className="w-3 h-3" />
            </Button>
            {template.type === "custom" && (
              <Button
                size="sm"
                onClick={() => onDelete(template.id)}
                variant="outline"
                className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

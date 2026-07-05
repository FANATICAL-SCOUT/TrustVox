"use client"

import { useId, useState } from "react"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { authFieldLabelClass } from "@/components/auth/auth-shell"
import {
  checkPassword,
  getPasswordStrength,
  PASSWORD_RULES,
} from "@/lib/auth/validation"

interface PasswordFieldProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
  /** Show the red→green strength meter + rule checklist below the field. */
  showStrength?: boolean
}

// Same look as authInputClass, but with right padding for the eye button.
const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-4 pr-11 text-ink outline-none transition placeholder:text-ink-muted focus:border-gold/40 focus:ring-2 focus:ring-gold/20"

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  autoComplete,
  showStrength = false,
}: PasswordFieldProps) {
  const reactId = useId()
  const fieldId = id ?? reactId
  const [visible, setVisible] = useState(false)

  const strength = getPasswordStrength(value)
  const checks = checkPassword(value)

  return (
    <div>
      <label htmlFor={fieldId} className={authFieldLabelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && value ? (
        <div className="mt-2.5">
          {/* Strength bar: fills + shifts hue red → gold → mint as rules are met. */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`}
                style={{ width: `${(strength.score / 4) * 100}%` }}
              />
            </div>
            <span className={`w-12 text-right text-xs font-medium ${strength.textClass}`}>
              {strength.label}
            </span>
          </div>

          {/* Live rule checklist — each turns mint when satisfied. */}
          <ul className="mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const passed = checks[rule.key]
              return (
                <li
                  key={rule.key}
                  className={`flex items-center gap-1.5 text-xs ${
                    passed ? "text-mint" : "text-ink-muted"
                  }`}
                >
                  {passed ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {rule.label}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

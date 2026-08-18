'use client'

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {cn} from '@/lib/utils'
import {Input} from '../ui/input'

const InputField = ({name, label, placeholder, type="text", register, error, validation, disabled, value}: FormInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className='space-y-2'>
        <label htmlFor={name} className="form-label">
            {label}
        </label>
        <div className="relative">
          <Input
          type={isPassword && showPassword ? 'text' : type}
          id = {name}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          className={cn('form-input', { 'opacity-50 cursor-not-allowed': disabled, 'pr-11': isPassword })}
          {...register(name, validation)}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={disabled}
              className="password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-500">{error.message}</p>}
    </div>
  )
}

export default InputField

# NestJS Journey Implementation Guide - Live Demo

**Purpose:** Step-by-step guide for implementing a complete user journey using NestJS  
**Audience:** Developers learning the NestJS pattern  
**Time:** ~30-45 minutes for a 3-step journey

---

## What We're Building

A simple "Register Interest" journey with 3 steps:
1. **Step 1:** Contact preference (radio buttons)
2. **Step 2:** Contact details (text inputs)
3. **Step 3:** Confirmation (checkbox)
4. **Confirmation page:** Success message

---

## Prerequisites

- NestJS is already bootstrapped in the project
- GOV.UK Frontend is installed
- You have the project running locally

---

## Step-by-Step Implementation

### Step 1: Create the Module Structure

**Time:** 2 minutes

Create the folder structure:

```bash
mkdir -p src/main/nest/register-interest
mkdir -p src/main/nest/register-interest/dto
mkdir -p src/main/views/register-interest
mkdir -p src/main/assets/locales/en/registerInterest
mkdir -p src/main/assets/locales/cy/registerInterest
```

**Files to create:**
```
src/main/nest/register-interest/
├── register-interest.module.ts
├── register-interest.controller.ts
├── register-interest.service.ts
└── dto/
    ├── step1.dto.ts
    ├── step2.dto.ts
    └── step3.dto.ts
```

// dto is short for Data Transfer Object which does not contain any business logic but is used to transfer data between different parts of the application and used to validate the data before it is processed by the service.

---

### Step 2: Create the Module

**Time:** 1 minute

**File:** `src/main/nest/register-interest/register-interest.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { RegisterInterestController } from './register-interest.controller';
import { RegisterInterestService } from './register-interest.service';

@Module({
  controllers: [RegisterInterestController],
  providers: [RegisterInterestService], 
})
export class RegisterInterestModule {}
```


**What this does:**
- Declares the module
- Registers the controller (handles HTTP requests)
- Registers the service (handles business logic)

---

### Step 3: Create the Service (Navigation Logic)

**Time:** 3 minutes

**File:** `src/main/nest/register-interest/register-interest.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class RegisterInterestService {
  getNextStep(currentStep: string, formData?: Record<string, unknown>): string {
    switch (currentStep) {
      case 'step1':
        return '/register-interest/step2';
      case 'step2':
        return '/register-interest/step3';
      case 'step3':
        return '/register-interest/confirmation';
      default:
        return '/register-interest/step1';
    }
  }

  getPreviousStep(currentStep: string): string | null {
    switch (currentStep) {
      case 'step2':
        return '/register-interest/step1';
      case 'step3':
        return '/register-interest/step2';
      default:
        return null;
    }
  }
}
```

**What this does:**
- Defines navigation between steps
- Can be extended for conditional routing based on form data
- Keeps navigation logic separate from controller

---

### Step 4: Create Validation Schemas (DTOs)

**Time:** 5 minutes

**File:** `src/main/nest/register-interest/dto/step1.dto.ts`

```typescript
import { z } from 'zod';

export const Step1Schema = z.object({
  contactPreference: z.enum(['email', 'phone', 'post'], {
    errorMap: () => ({ message: 'Select how you would like to be contacted' }),
  }),
});

export type Step1Dto = z.infer<typeof Step1Schema>;
```

**File:** `src/main/nest/register-interest/dto/step2.dto.ts`

```typescript
import { z } from 'zod';

export const Step2Schema = z.object({
  fullName: z
    .string()
    .min(1, 'Enter your full name')
    .max(100, 'Full name must be 100 characters or less'),
  
  email: z
    .string()
    .min(1, 'Enter your email address')
    .email('Enter a valid email address'),
  
  phoneNumber: z
    .string()
    .min(1, 'Enter your phone number')
    .regex(/^[0-9\s\-\+\(\)]+$/, 'Enter a valid phone number'),
});

export type Step2Dto = z.infer<typeof Step2Schema>;
```

**File:** `src/main/nest/register-interest/dto/step3.dto.ts`

```typescript
import { z } from 'zod';

export const Step3Schema = z.object({
  confirmAccuracy: z
    .string()
    .refine((val) => val === 'confirmed', {
      message: 'Confirm that the information you have provided is accurate',
    }),
});

export type Step3Dto = z.infer<typeof Step3Schema>;
```

**What this does:**
- Defines validation rules for each step
- Provides type safety with TypeScript
- Generates clear error messages

---

### Step 5: Create the Controller (Routes)

**Time:** 10 minutes

**File:** `src/main/nest/register-interest/register-interest.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { getTranslationFunction, loadStepNamespace } from '../../modules/steps/i18n';
import { OidcGuard } from '../guards/oidc.guard';
import { Step1Schema } from './dto/step1.dto';
import { Step2Schema } from './dto/step2.dto';
import { Step3Schema } from './dto/step3.dto';
import { RegisterInterestService } from './register-interest.service';

@Controller('register-interest')
@UseGuards(OidcGuard)
export class RegisterInterestController {
  constructor(private readonly registerInterestService: RegisterInterestService) {}

  // ============================================
  // STEP 1: Contact Preference
  // ============================================

  @Get('step1')
  @Render('register-interest/step1.njk')
  async getStep1(@Req() req: Request) {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step1', 'registerInterest');
    const t = getTranslationFunction(req, 'step1', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      content: t('step1'), // Load translations
      form: registerInterest.step1 || {},
      backLink: null,
      t, // Pass translation function to template
    };
  }

  @Post('step1')
  async postStep1(@Req() req: Request, @Res() res: Response) {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step1', 'registerInterest');
    const t = getTranslationFunction(req, 'step1', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;
    
    // Validate form data
    const result = Step1Schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstErrorField = Object.keys(errors)[0];
      const error = {
        field: firstErrorField,
        text: (errors as Record<string, string[]>)[firstErrorField]?.[0] || 'Validation error',
      };

      return res.render('register-interest/step1.njk', {
        content: t('step1'), // Include translations
        form: req.body,
        error,
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [{ text: error.text, href: `#${error.field}` }],
        },
        backLink: null,
        t, // Pass translation function
      });
    }

    // Save to session
    if (!session.registerInterest) {
      session.registerInterest = {};
    }
    (session.registerInterest as Record<string, unknown>).step1 = result.data;

    // Navigate to next step
    const nextStep = this.registerInterestService.getNextStep('step1', result.data);
    return res.redirect(nextStep);
  }

  // ============================================
  // STEP 2: Contact Details
  // ============================================

  @Get('step2')
  @Render('register-interest/step2.njk')
  getStep2(@Req() req: Request) {
    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      form: registerInterest.step2 || {},
      backLink: this.registerInterestService.getPreviousStep('step2'),
    };
  }

  @Post('step2')
  async postStep2(@Req() req: Request, @Res() res: Response) {
    const session = req.session as unknown as Record<string, unknown>;
    
    // Validate form data
    const result = Step2Schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const errorList = Object.entries(errors).map(([field, messages]) => ({
        text: messages?.[0] || 'Validation error',
        href: `#${field}`,
      }));

      return res.render('register-interest/step2.njk', {
        form: req.body,
        errors: Object.fromEntries(
          Object.entries(errors).map(([field, messages]) => [
            field,
            { text: messages?.[0] },
          ])
        ),
        errorSummary: {
          titleText: 'There is a problem',
          errorList,
        },
        backLink: this.registerInterestService.getPreviousStep('step2'),
      });
    }

    // Save to session
    if (!session.registerInterest) {
      session.registerInterest = {};
    }
    (session.registerInterest as Record<string, unknown>).step2 = result.data;

    // Navigate to next step
    const nextStep = this.registerInterestService.getNextStep('step2', result.data);
    return res.redirect(nextStep);
  }

  // ============================================
  // STEP 3: Confirmation
  // ============================================

  @Get('step3')
  @Render('register-interest/step3.njk')
  getStep3(@Req() req: Request) {
    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      form: registerInterest.step3 || {},
      summary: {
        step1: registerInterest.step1 || {},
        step2: registerInterest.step2 || {},
      },
      backLink: this.registerInterestService.getPreviousStep('step3'),
    };
  }

  @Post('step3')
  async postStep3(@Req() req: Request, @Res() res: Response) {
    const session = req.session as unknown as Record<string, unknown>;
    
    // Validate form data
    const result = Step3Schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstErrorField = Object.keys(errors)[0];
      const error = {
        field: firstErrorField,
        text: (errors as Record<string, string[]>)[firstErrorField]?.[0] || 'Validation error',
      };

      const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

      return res.render('register-interest/step3.njk', {
        form: req.body,
        error,
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [{ text: error.text, href: `#${error.field}` }],
        },
        summary: {
          step1: registerInterest.step1 || {},
          step2: registerInterest.step2 || {},
        },
        backLink: this.registerInterestService.getPreviousStep('step3'),
      });
    }

    // Save to session
    if (!session.registerInterest) {
      session.registerInterest = {};
    }
    (session.registerInterest as Record<string, unknown>).step3 = result.data;

    // Navigate to confirmation
    const nextStep = this.registerInterestService.getNextStep('step3', result.data);
    return res.redirect(nextStep);
  }

  // ============================================
  // CONFIRMATION PAGE
  // ============================================

  @Get('confirmation')
  @Render('register-interest/confirmation.njk')
  getConfirmation(@Req() req: Request) {
    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      data: {
        step1: registerInterest.step1 || {},
        step2: registerInterest.step2 || {},
        step3: registerInterest.step3 || {},
      },
    };
  }
}
```

**What this does:**
- Defines all routes (GET and POST for each step)
- Handles validation with Zod schemas
- Manages session data
- Renders templates with error handling
- Uses `@Render()` decorator for GET routes
- Uses `res.render()` for POST routes (to show errors)

---

### Step 6: Register the Module

**Time:** 1 minute

**File:** `src/main/nest/app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { NestJourneyModule } from './journey/nest-journey.module';
import { PostcodeModule } from './postcode/postcode.module';
import { RegisterInterestModule } from './register-interest/register-interest.module'; // Add this

@Module({
  imports: [
    PostcodeModule,
    NestJourneyModule,
    RegisterInterestModule, // Add this
  ],
})
export class AppModule {}
```

**What this does:**
- Registers your new module with NestJS
- Makes the routes available

---

### Step 7: Create Translation Files

**Time:** 5 minutes

**File:** `src/main/assets/locales/en/registerInterest/step1.json`

```json
{
  "title": "How would you like to be contacted?",
  "options": {
    "email": "Email",
    "phone": "Phone",
    "post": "Post"
  },
  "buttons": {
    "continue": "Continue"
  }
}
```

**File:** `src/main/assets/locales/en/registerInterest/step2.json`

```json
{
  "title": "Your contact details",
  "fields": {
    "fullName": {
      "label": "Full name"
    },
    "email": {
      "label": "Email address",
      "hint": "We will use this to send you updates"
    },
    "phoneNumber": {
      "label": "Phone number",
      "hint": "Include the country code if outside the UK"
    }
  },
  "buttons": {
    "continue": "Continue"
  }
}
```

**File:** `src/main/assets/locales/en/registerInterest/step3.json`

```json
{
  "title": "Check your answers",
  "summary": {
    "contactPreference": {
      "label": "Contact preference",
      "changeLink": "/register-interest/step1"
    },
    "contactDetails": {
      "label": "Contact details",
      "changeLink": "/register-interest/step2"
    }
  },
  "declaration": {
    "title": "Declaration",
    "checkbox": "I confirm that the information I have provided is accurate"
  },
  "buttons": {
    "submit": "Submit registration"
  }
}
```

**File:** `src/main/assets/locales/en/registerInterest/confirmation.json`

```json
{
  "title": "Registration complete",
  "body": "Your reference number is your email address",
  "whatHappensNext": {
    "title": "What happens next",
    "body": "We will contact you using your preferred method within 5 working days."
  },
  "returnToDashboard": "Return to dashboard"
}
```

**For Welsh (cy):** Create the same files with `cy-` prefixed placeholders:

**File:** `src/main/assets/locales/cy/registerInterest/step1.json`

```json
{
  "title": "cy-How would you like to be contacted?",
  "options": {
    "email": "cy-Email",
    "phone": "cy-Phone",
    "post": "cy-Post"
  },
  "buttons": {
    "continue": "cy-Continue"
  }
}
```

*(Repeat for step2, step3, and confirmation)*

---

### Step 8: Create Nunjucks Templates

**Time:** 10 minutes

**File:** `src/main/views/register-interest/step1.njk`

```nunjucks
{% extends "journeyTemplate.njk" %}

{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block page_title %}{{ t('step1:title') }}{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      {% if errorSummary %}
        {{ govukErrorSummary(errorSummary) }}
      {% endif %}

      <form action="/register-interest/step1" method="post" novalidate>
        <input type="hidden" name="_csrf" value="{{ csrfToken }}">
        
        <div class="govuk-form-group {% if error %}govuk-form-group--error{% endif %}">
          <fieldset class="govuk-fieldset">
            <legend class="govuk-fieldset__legend govuk-fieldset__legend--l">
              <h1 class="govuk-fieldset__heading">
                {{ t('step1:title') }}
              </h1>
            </legend>
            
            {% if error %}
              <p id="contactPreference-error" class="govuk-error-message">
                <span class="govuk-visually-hidden">Error:</span>
                {{ error.text }}
              </p>
            {% endif %}
            
            <div class="govuk-radios" data-module="govuk-radios">
              <div class="govuk-radios__item">
                <input class="govuk-radios__input" id="contactPreference-email" 
                       name="contactPreference" type="radio" value="email" 
                       {{ 'checked' if form.contactPreference === 'email' }}>
                <label class="govuk-label govuk-radios__label" for="contactPreference-email">
                  {{ t('step1:options.email') }}
                </label>
              </div>
              <div class="govuk-radios__item">
                <input class="govuk-radios__input" id="contactPreference-phone" 
                       name="contactPreference" type="radio" value="phone" 
                       {{ 'checked' if form.contactPreference === 'phone' }}>
                <label class="govuk-label govuk-radios__label" for="contactPreference-phone">
                  {{ t('step1:options.phone') }}
                </label>
              </div>
              <div class="govuk-radios__item">
                <input class="govuk-radios__input" id="contactPreference-post" 
                       name="contactPreference" type="radio" value="post" 
                       {{ 'checked' if form.contactPreference === 'post' }}>
                <label class="govuk-label govuk-radios__label" for="contactPreference-post">
                  {{ t('step1:options.post') }}
                </label>
              </div>
            </div>
          </fieldset>
        </div>
        
        <button class="govuk-button" data-module="govuk-button">
          {{ t('step1:buttons.continue') }}
        </button>
      </form>
    </div>
  </div>
{% endblock %}
```

**File:** `src/main/views/register-interest/step2.njk`

```nunjucks
{% extends "journeyTemplate.njk" %}

{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block page_title %}{{ t('step2:title') }}{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      {% if errorSummary %}
        {{ govukErrorSummary(errorSummary) }}
      {% endif %}

      <form action="/register-interest/step2" method="post" novalidate>
        <input type="hidden" name="_csrf" value="{{ csrfToken }}">
        
        <h1 class="govuk-heading-l">{{ t('step2:title') }}</h1>
        
        {# Full Name #}
        <div class="govuk-form-group {% if errors.fullName %}govuk-form-group--error{% endif %}">
          <label class="govuk-label" for="fullName">
            {{ t('step2:fields.fullName.label') }}
          </label>
          {% if errors.fullName %}
            <p id="fullName-error" class="govuk-error-message">
              <span class="govuk-visually-hidden">Error:</span>
              {{ errors.fullName.text }}
            </p>
          {% endif %}
          <input class="govuk-input {% if errors.fullName %}govuk-input--error{% endif %}" 
                 id="fullName" name="fullName" type="text" value="{{ form.fullName }}">
        </div>
        
        {# Email #}
        <div class="govuk-form-group {% if errors.email %}govuk-form-group--error{% endif %}">
          <label class="govuk-label" for="email">
            {{ t('step2:fields.email.label') }}
          </label>
          <div class="govuk-hint">
            {{ t('step2:fields.email.hint') }}
          </div>
          {% if errors.email %}
            <p id="email-error" class="govuk-error-message">
              <span class="govuk-visually-hidden">Error:</span>
              {{ errors.email.text }}
            </p>
          {% endif %}
          <input class="govuk-input {% if errors.email %}govuk-input--error{% endif %}" 
                 id="email" name="email" type="email" value="{{ form.email }}" 
                 autocomplete="email">
        </div>
        
        {# Phone Number #}
        <div class="govuk-form-group {% if errors.phoneNumber %}govuk-form-group--error{% endif %}">
          <label class="govuk-label" for="phoneNumber">
            {{ t('step2:fields.phoneNumber.label') }}
          </label>
          <div class="govuk-hint">
            {{ t('step2:fields.phoneNumber.hint') }}
          </div>
          {% if errors.phoneNumber %}
            <p id="phoneNumber-error" class="govuk-error-message">
              <span class="govuk-visually-hidden">Error:</span>
              {{ errors.phoneNumber.text }}
            </p>
          {% endif %}
          <input class="govuk-input govuk-input--width-20 {% if errors.phoneNumber %}govuk-input--error{% endif %}" 
                 id="phoneNumber" name="phoneNumber" type="tel" value="{{ form.phoneNumber }}" 
                 autocomplete="tel">
        </div>
        
        <button class="govuk-button" data-module="govuk-button">
          {{ t('step2:buttons.continue') }}
        </button>
      </form>
    </div>
  </div>
{% endblock %}
```

**File:** `src/main/views/register-interest/step3.njk`

```nunjucks
{% extends "journeyTemplate.njk" %}

{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block page_title %}{{ t('step3:title') }}{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      {% if errorSummary %}
        {{ govukErrorSummary(errorSummary) }}
      {% endif %}

      <h1 class="govuk-heading-l">{{ t('step3:title') }}</h1>
      
      {# Summary List #}
      <dl class="govuk-summary-list">
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">
            {{ t('step3:summary.contactPreference.label') }}
          </dt>
          <dd class="govuk-summary-list__value">
            {{ summary.step1.contactPreference }}
          </dd>
          <dd class="govuk-summary-list__actions">
            <a class="govuk-link" href="{{ t('step3:summary.contactPreference.changeLink') }}">
              Change<span class="govuk-visually-hidden"> contact preference</span>
            </a>
          </dd>
        </div>
        
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">
            Full name
          </dt>
          <dd class="govuk-summary-list__value">
            {{ summary.step2.fullName }}
          </dd>
          <dd class="govuk-summary-list__actions">
            <a class="govuk-link" href="{{ t('step3:summary.contactDetails.changeLink') }}">
              Change<span class="govuk-visually-hidden"> full name</span>
            </a>
          </dd>
        </div>
        
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">
            Email
          </dt>
          <dd class="govuk-summary-list__value">
            {{ summary.step2.email }}
          </dd>
          <dd class="govuk-summary-list__actions">
            <a class="govuk-link" href="{{ t('step3:summary.contactDetails.changeLink') }}">
              Change<span class="govuk-visually-hidden"> email</span>
            </a>
          </dd>
        </div>
        
        <div class="govuk-summary-list__row">
          <dt class="govuk-summary-list__key">
            Phone number
          </dt>
          <dd class="govuk-summary-list__value">
            {{ summary.step2.phoneNumber }}
          </dd>
          <dd class="govuk-summary-list__actions">
            <a class="govuk-link" href="{{ t('step3:summary.contactDetails.changeLink') }}">
              Change<span class="govuk-visually-hidden"> phone number</span>
            </a>
          </dd>
        </div>
      </dl>
      
      <form action="/register-interest/step3" method="post" novalidate>
        <input type="hidden" name="_csrf" value="{{ csrfToken }}">
        
        <h2 class="govuk-heading-m">{{ t('step3:declaration.title') }}</h2>
        
        <div class="govuk-form-group {% if error %}govuk-form-group--error{% endif %}">
          {% if error %}
            <p id="confirmAccuracy-error" class="govuk-error-message">
              <span class="govuk-visually-hidden">Error:</span>
              {{ error.text }}
            </p>
          {% endif %}
          
          <div class="govuk-checkboxes" data-module="govuk-checkboxes">
            <div class="govuk-checkboxes__item">
              <input class="govuk-checkboxes__input" id="confirmAccuracy" 
                     name="confirmAccuracy" type="checkbox" value="confirmed" 
                     {{ 'checked' if form.confirmAccuracy === 'confirmed' }}>
              <label class="govuk-label govuk-checkboxes__label" for="confirmAccuracy">
                {{ t('step3:declaration.checkbox') }}
              </label>
            </div>
          </div>
        </div>
        
        <button class="govuk-button" data-module="govuk-button">
          {{ t('step3:buttons.submit') }}
        </button>
      </form>
    </div>
  </div>
{% endblock %}
```

**File:** `src/main/views/register-interest/confirmation.njk`

```nunjucks
{% extends "journeyTemplate.njk" %}

{% block page_title %}{{ t('confirmation:title') }}{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <div class="govuk-panel govuk-panel--confirmation">
        <h1 class="govuk-panel__title">
          {{ t('confirmation:title') }}
        </h1>
        <div class="govuk-panel__body">
          {{ t('confirmation:body') }}<br>
          <strong>{{ data.step2.email }}</strong>
        </div>
      </div>

      <h2 class="govuk-heading-m">{{ t('confirmation:whatHappensNext.title') }}</h2>
      <p class="govuk-body">{{ t('confirmation:whatHappensNext.body') }}</p>

      <p class="govuk-body">
        <a href="/dashboard" class="govuk-link">
          {{ t('confirmation:returnToDashboard') }}
        </a>
      </p>
    </div>
  </div>
{% endblock %}
```

---

### Step 9: Test the Journey

**Time:** 5 minutes

1. **Start the server:**
   ```bash
   yarn dev
   ```

2. **Navigate to the journey:**
   ```
   http://localhost:3209/register-interest/step1
   ```

3. **Test validation:**
   - Submit without selecting anything → Should show error
   - Submit with valid data → Should progress to step 2

4. **Test navigation:**
   - Click "Back" link → Should return to previous step
   - Data should persist in session

5. **Test completion:**
   - Complete all steps → Should show confirmation page

---

## Common Patterns

### Pattern 1: Single Field Validation Error

```typescript
// ✅ Do this instead - TypeScript will be happy
const session = req.session as Record<string, unknown> & { registerInterest: Record<string, unknown> };
const error = {
  field: Object.keys(errors)[0],
  text: errors[Object.keys(errors)[0]]?.[0] || 'Validation error',
};

return res.render('template.njk', {
  form: req.body,
  error,
  errorSummary: {
    titleText: 'There is a problem',
    errorList: [{ text: error.text, href: `#${error.field}` }],
  },
});
      titleText: 'There is a problem',
      errorList: [{ text: error.text, href: `#${error.field}` }],
    },
  });
}
```

### Pattern 2: Multiple Field Validation Errors

```typescript
if (!result.success) {
  const errors = result.error.flatten().fieldErrors;
  const errorList = Object.entries(errors).map(([field, messages]) => ({
    text: messages?.[0] || 'Validation error',
    href: `#${field}`,
  }));

  return res.render('template.njk', {
    form: req.body,
    errors: Object.fromEntries(
      Object.entries(errors).map(([field, messages]) => [
        field,
        { text: messages?.[0] },
      ])
    ),
    errorSummary: {
      titleText: 'There is a problem',
      errorList,
    },
  });
}
```

### Pattern 3: Session Management

```typescript
// Initialize session namespace
if (!session.registerInterest) {
  session.registerInterest = {};
}

// Save step data
(session.registerInterest as Record<string, unknown>).step1 = result.data;

// Retrieve step data
const registerInterest = (session.registerInterest as Record<string, unknown>) || {};
const step1Data = registerInterest.step1 || {};
```

---

## Demo Script

### Introduction (2 minutes)

"Today I'm going to show you how to build a complete user journey using NestJS. We'll create a 3-step registration journey with validation, session management, and GOV.UK Design System components."

### Module Setup (3 minutes)

1. Create folder structure
2. Create module file
3. Register in AppModule

"First, we set up the module structure. NestJS uses modules to organize features."

### Service Layer (3 minutes)

1. Create service with navigation logic
2. Explain separation of concerns

"The service handles navigation logic. This keeps the controller clean and makes testing easier."

### Validation (5 minutes)

1. Create DTOs with Zod schemas
2. Show type inference
3. Demonstrate error messages

"We use Zod for validation. It provides type safety and clear error messages."

### Controller (10 minutes)

1. Create GET route with `@Render()`
2. Create POST route with validation
3. Show error handling
4. Demonstrate session management

"The controller handles HTTP requests. GET routes render templates, POST routes validate and redirect."

### Templates (10 minutes)

1. Create step1 template with radios
2. Create step2 template with inputs
3. Show error summary pattern
4. Create confirmation page

"Templates use GOV.UK Design System components. Error handling follows the GOV.UK pattern."

### Testing (5 minutes)

1. Start server
2. Navigate through journey
3. Trigger validation errors
4. Complete successfully

"Let's test it end-to-end. Notice how validation errors are shown, and data persists across steps."

---

## Key Takeaways

1. **Modular Structure** - Each journey is a self-contained module
2. **Type Safety** - Zod schemas provide compile-time validation
3. **Separation of Concerns** - Controller, service, and DTOs have clear responsibilities
4. **Session Management** - Data persists across steps automatically
5. **GOV.UK Compliance** - Templates follow Design System patterns
6. **Error Handling** - Consistent error display across all steps

---

## Next Steps

After the demo, developers should:

1. Review the existing `nest-journey` implementation
2. Try creating their own simple journey
3. Read the comparison documentation: `/pcs-frontend/docs/NESTJS_JOURNEY_COMPARISON.md`
4. Explore advanced patterns (conditional routing, complex validation)

---

## Troubleshooting

### Module not found
- Check `AppModule` imports
- Verify file paths are correct

### Routes not working
- Ensure module is registered in `AppModule`
- Check controller decorator: `@Controller('register-interest')`
- Verify OIDC guard is not blocking access

### Validation not working
- Check Zod schema syntax
- Verify field names match between DTO and template
- Ensure `safeParse()` is used, not `parse()`

### Session data not persisting
- Check session middleware is configured
- Verify session namespace initialization
- Ensure data is saved before redirect

### Templates not rendering
- Check template path matches `@Render()` decorator
- Verify translation files exist
- Ensure `journeyTemplate.njk` exists

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Zod Documentation](https://zod.dev/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Project Documentation](/pcs-frontend/docs/)

---

*Guide created: January 2026*  
*For questions, contact the Frontend Engineering team*

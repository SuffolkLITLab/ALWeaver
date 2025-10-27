export const SAMPLE_INTERVIEW = `metadata:
  title: City Council Intake
  language: en
  author: Docassemble Team

---
question: |
  Welcome to the City Council Intake Form
subquestion: |
  Please confirm your contact details to begin.
fields:
  - Name: user.name.full
    datatype: text
    required: true
  - Email: user.contact.email
    datatype: email
  - Phone number: user.contact.phone
    datatype: number

---
code: |
  user.is_minor = user.age < 18
  if user.is_minor:
      guardian.required = True

---
attachment:
  name: Intake Summary
  filename: intake-summary.docx
  valid formats:
    - docx
    - pdf
  content: |
    ## Intake Summary

    **Name:** {{ user.name.full }}
    **Email:** {{ user.contact.email }}

---
interview_order:
  mandatory: True
  code: |
    user.name.full
    user.contact.email
    user.contact.phone
    guardian.name.full

---
event: review
`;

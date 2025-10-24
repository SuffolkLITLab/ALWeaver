export const sampleInterviewYaml = `---
metadata:
  title: Playground Intake
  summary: Collect basic data for the Playground housing matter.
  language: en
  author: Code Lab
  show login: false
  tags:
    - housing
    - docassemble
---
objects:
  - user: Individual
  - landlord: Individual
---
question: |-
  👋 Let's learn about you.
subquestion: |
  Please share a few details so we can tailor the interview.
fields:
  - First name: user.name.first
    hint: Given name
  - Last name: user.name.last
    hint: Surname
  - Email: user.email
    datatype: email
continue button field: continue_intro
---
code: |
  if not defined('user_is_tenant'):
      user_is_tenant = True
  if user_is_tenant:
      next_question = 'tenant_details'
  else:
      next_question = 'landlord_details'
---
question: Tenant background
id: tenant_details
fields:
  - Do you rent the property?: user_is_tenant
    datatype: yesno
  - What type of lease do you have?: lease_type
    datatype: dropdown
    choices:
      - month-to-month
      - annual
      - other
    show if: user_is_tenant
---
interview_order:
  mandatory: True
  code: |
    if user_is_tenant:
        tenant_details
    else:
        landlord_details
    final_screen
---
event: final_screen
question: Review your answers
subquestion: |
  You can make any final adjustments before we generate documents.
buttons:
  - Exit: exit
  - Restart: restart
`;

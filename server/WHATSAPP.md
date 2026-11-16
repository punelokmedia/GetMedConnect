# Direct WhatsApp appointment notifications

The server sends messages directly through Meta's official WhatsApp Cloud API at graph.facebook.com.

Both the patient lead and assigned doctor receive separate messages after a Scheduled/Confirmed booking is saved. Rescheduling, reassignment and reopening also notify both recipients. Status changes use the separately configured status templates described in NOTIFICATIONS.md. Notes or conversion alone do not send another message. Messaging failure never undoes the booking.

## Setup in Meta

1. Create a Meta developer app with the WhatsApp product. Connect your WhatsApp Business Account and register your business sender. Copy the sender's **Phone number ID** from WhatsApp API Setup, not its display number or business account ID.
2. For production, create a system user access token with whatsapp_business_messaging permission and access to the WhatsApp account. Dashboard temporary tokens expire and are for testing. Complete the production onboarding required for your Meta account.
3. Create two approved utility templates in WhatsApp Manager with positional body parameters. Both must use five variables in this order: {{1}} recipient name, {{2}} patient name, {{3}} doctor name, {{4}} appointment date/time in IST, {{5}} booking reference. Use body text only, without variable headers or buttons.

Patient template (gmc_patient_appointment):

> Hello {{1}}, your GetMedConnect appointment for {{2}} with Dr {{3}} is scheduled for {{4}}. Booking reference: {{5}}. Contact GetMedConnect if you need to make a change.

Doctor template (gmc_doctor_appointment):

> Hello Dr {{1}}, GetMedConnect has scheduled an appointment for patient {{2}} with Dr {{3}} at {{4}}. Booking reference: {{5}}. Please check your doctor portal for details.

4. Set these server-only environment variables in server/.env locally and in the API hosting environment for production:

- WHATSAPP_ACCESS_TOKEN: Meta system user token.
- WHATSAPP_PHONE_NUMBER_ID: sender phone number ID.
- WHATSAPP_GRAPH_API_VERSION: a supported version selected from your Meta app, for example v27.0.
- WHATSAPP_PATIENT_TEMPLATE: approved patient template name.
- WHATSAPP_DOCTOR_TEMPLATE: approved doctor template name.
- WHATSAPP_TEMPLATE_LANGUAGE: exact approved language code, for example en_US.

5. Restart/redeploy the API. Obtain both recipients' agreement to receive appointment updates before sending. With Meta's test sender, add and verify test recipients in API Setup first. Use your registered business sender for production.

Indian ten-digit mobile numbers are prefixed with 91. Other countries require an explicit + country code in saved phone numbers. Notes and specialty are not sent. Keep access tokens out of frontend variables, source control and chat.

## Send results

The admin displays separate patient and doctor results. The booking response includes whatsapp.patient and whatsapp.doctor with accepted, not_configured or failed. Accepted means Meta accepted the request, not confirmed delivery. Meta message IDs are returned for accepted requests. Delivery webhooks, durable retries and stored delivery history are not implemented. Check Meta before manually resending uncertain requests to avoid duplicates. Two requests run in parallel with a ten-second timeout each.

Official references: [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [WhatsApp template guide](https://whatsappbusiness.com/blog/manage-message-templates-whatsapp-business-api/).

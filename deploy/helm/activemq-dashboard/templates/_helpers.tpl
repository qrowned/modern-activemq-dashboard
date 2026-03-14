{{/*
Full name for all resources, capped at 63 chars.
*/}}
{{- define "activemq-dashboard.fullname" -}}
{{- printf "%s-activemq-dashboard" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Standard labels applied to every resource.
*/}}
{{- define "activemq-dashboard.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels for the backend Deployment / Service.
*/}}
{{- define "activemq-dashboard.backend.selectorLabels" -}}
app.kubernetes.io/name: activemq-dashboard-backend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for the frontend Deployment / Service.
*/}}
{{- define "activemq-dashboard.frontend.selectorLabels" -}}
app.kubernetes.io/name: activemq-dashboard-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend Service name — used by the frontend to build BACKEND_URL.
*/}}
{{- define "activemq-dashboard.backend.serviceName" -}}
{{- printf "%s-backend" (include "activemq-dashboard.fullname" .) }}
{{- end }}

{{/*
Frontend Service name.
*/}}
{{- define "activemq-dashboard.frontend.serviceName" -}}
{{- printf "%s-frontend" (include "activemq-dashboard.fullname" .) }}
{{- end }}

{{/*
Secret name — uses existingSecret if provided, otherwise the chart-managed secret.
*/}}
{{- define "activemq-dashboard.secretName" -}}
{{- if .Values.existingSecret }}
{{- .Values.existingSecret }}
{{- else }}
{{- printf "%s-credentials" (include "activemq-dashboard.fullname" .) }}
{{- end }}
{{- end }}

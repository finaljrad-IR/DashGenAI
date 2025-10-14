# Nunjucks Templates Folder

This folder contains Nunjucks templates for rendering project dashboards.

## Location
`/server/templates/`

## Current Templates

### dashboard.html
This is the main dashboard template file. You can **replace the entire contents** of this file with your custom dashboard template.

## How to Use

1. **Paste Your Template**: Replace the contents of `dashboard.html` with your complete HTML dashboard template
2. **Use Nunjucks Variables**: Your template can access the following variables:

### Available Variables

When a project is created, the following variables are passed to the template:

```javascript
{
  projectName: "string",      // Name of the project
  databaseName: "string",     // MongoDB database name
  createdDate: "string",      // ISO date string
  customData: {               // Any custom data passed in templateData
    // Your custom fields here
  }
}
```

### Example Usage in Your Template

```html
<h1>{{ projectName }}</h1>
<p>Database: {{ databaseName }}</p>
<p>Created: {{ createdDate }}</p>

{% if customData %}
  {% if customData.totalOrders %}
    <div>Total Orders: {{ customData.totalOrders }}</div>
  {% endif %}
{% endif %}
```

## Nunjucks Syntax Reference

- Variables: `{{ variableName }}`
- Conditionals: `{% if condition %} ... {% endif %}`
- Loops: `{% for item in items %} ... {% endfor %}`
- Filters: `{{ variable | filter }}`
- Comments: `{# This is a comment #}`

## Template Rendering

Templates are automatically rendered when:
1. A new project is created (POST /api/projects)
2. A project is updated with new templateData (PUT /api/projects/:id)

The rendered output is stored in the project's `renderedOutput` field in the database.

## Multiple Templates

To add more templates:
1. Create a new `.html` file in this directory (e.g., `analytics-dashboard.html`)
2. Update `ProjectService.renderTemplate()` calls to use the new template name
3. Configure which template to use based on project type or user selection

## Documentation

For full Nunjucks documentation, visit: https://mozilla.github.io/nunjucks/

# Claude Issue Assistant Setup

This repository includes a GitHub Action that allows you to ask Claude for help directly in GitHub issues by mentioning `@claude`.

## Setup Instructions

### 1. Add Anthropic API Key as Secret

1. Go to your repository settings: `https://github.com/aungphone-mm/yangon-bus/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key (get one at https://console.anthropic.com/)
5. Click "Add secret"

### 2. How to Use

Once the secret is configured, you can ask Claude questions in any issue:

**In a new issue:**
```markdown
@claude How do I add a new bus route to the data?
```

**In a comment:**
```markdown
@claude Can you explain how the pathfinding algorithm works?
```

**In follow-up questions:**
```markdown
@claude What's the difference between stop_lookup.json and planner_graph.json?
```

### 3. What Claude Can Help With

- Understanding the codebase structure
- Explaining how features work (route planning, search, map display)
- Troubleshooting issues
- Suggesting implementation approaches
- Answering questions about the Yangon Bus Transit App architecture

### 4. Limitations

- Claude responds based on the repository context and general knowledge
- For very specific bugs, you may need to provide code snippets or error messages
- Claude cannot access external resources or make changes to the repository
- Rate limits apply based on your Anthropic API plan

### 5. Example Questions

- "How does the transfer optimization work in the pathfinding algorithm?"
- "What's the best way to add a new tab to the UI?"
- "How are bus stops stored and indexed?"
- "Can you explain the MapView component's initialization pattern?"
- "How do I update the transit data files?"

## Workflow Details

The workflow (`claude-issue-assistant.yml`) triggers when:
- A new issue is created containing `@claude`
- An existing issue is edited to include `@claude`
- A comment is added with `@claude`
- A comment is edited to include `@claude`

The workflow uses Claude Sonnet 4.5 model with up to 4096 tokens for responses.

## Troubleshooting

If Claude doesn't respond:
1. Check that the `ANTHROPIC_API_KEY` secret is set correctly
2. Ensure you mentioned `@claude` in your message
3. Check the Actions tab for workflow run logs
4. Verify the workflow has `issues: write` permissions

## Cost Considerations

Each Claude API call costs money based on your Anthropic pricing plan. Monitor your usage at https://console.anthropic.com/

To avoid unexpected costs, you can:
- Set usage limits in the Anthropic console
- Disable the workflow in `.github/workflows/claude-issue-assistant.yml`
- Remove the workflow file entirely if not needed

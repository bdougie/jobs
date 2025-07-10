# Postmortem: Tailwind CSS v4 Migration Issues

**Date:** July 10, 2025  
**Author:** Engineering Team  
**Severity:** High - Complete UI/CSS failure  
**Duration:** ~30 minutes  

## Summary

The application experienced a complete loss of styling after an attempted migration to Tailwind CSS v4. All UI elements appeared unstyled, making the application unusable. The issue was resolved by properly configuring Tailwind v4's new architecture and dependencies.

## Timeline

1. **Initial State**: Application using Tailwind CSS v4 with v3-style configuration
2. **Issue Discovered**: UI completely broken with no styles applied
3. **First Attempt**: Tried downgrading to Tailwind v3 (partially worked but was reverted)
4. **Resolution**: Properly configured Tailwind v4 with required dependencies

## Root Causes

### 1. **Missing PostCSS Plugin**
Tailwind v4 requires a separate PostCSS plugin (`@tailwindcss/postcss`) that wasn't installed. The error message was:
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. 
The PostCSS plugin has moved to a separate package...
```

### 2. **Incorrect CSS Import Syntax**
The app.css file was using mixed syntax:
- **Wrong**: `@import "tailwindcss/preflight"; @import "tailwindcss/utilities";`
- **Correct**: `@import "tailwindcss";`

### 3. **Vite Configuration Conflict**
The vite.config.ts was overriding PostCSS settings:
```typescript
// This was blocking PostCSS from working
css: {
  postcss: {
    plugins: []
  }
}
```

### 4. **Outdated PostCSS Configuration**
The postcss.config.js was trying to use paths that don't exist in v4:
- **Wrong**: `'tailwindcss/postcss': {}`
- **Correct**: `'@tailwindcss/postcss': {}`

## What Fixed It

### 1. **Installed Required Dependencies**
```bash
npm install -D @tailwindcss/postcss
```

### 2. **Updated postcss.config.js**
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### 3. **Fixed CSS Import**
```css
@import "tailwindcss";
```

### 4. **Cleaned Vite Configuration**
Removed the PostCSS override from vite.config.ts:
```typescript
export default defineConfig({
  plugins: [sveltekit()]
  // Removed css.postcss configuration
});
```

### 5. **Migrated Theme to CSS**
Moved theme configuration from JavaScript to CSS using Tailwind v4's `@theme` directive:
```css
@theme {
  --color-background: 210 20% 98%;
  --color-foreground: 215 25% 27%;
  // ... other theme variables
}
```

## Key Differences: Tailwind v3 vs v4

### v3 Approach
- JavaScript-based configuration (tailwind.config.js)
- PostCSS plugin included in main package
- Uses `@tailwind` directives

### v4 Approach
- CSS-based configuration using `@theme`
- Separate PostCSS plugin package required
- Single `@import "tailwindcss"` statement
- Simplified JavaScript config (only content paths)

## Lessons Learned

1. **Read Migration Guides**: Tailwind v4 is a complete rewrite with breaking changes
2. **Check Dependencies**: Major version updates often require additional packages
3. **Clear Build Caches**: When debugging CSS issues, clear Vite/build caches
4. **Version Compatibility**: Ensure all Tailwind-related packages are compatible versions

## Prevention Measures

1. **Test in Development**: Always test major dependency updates locally first
2. **Gradual Migration**: Consider using a feature branch for major updates
3. **Documentation**: Keep track of custom configurations that may need migration
4. **Build Verification**: Verify CSS output size changes after updates (27.81 kB vs 23.32 kB indicated proper generation)

## Final Configuration Files

### postcss.config.js
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### tailwind.config.js (v4)
```javascript
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  plugins: []
}
```

### package.json dependencies
```json
"devDependencies": {
  "@tailwindcss/postcss": "^4.1.11",
  "tailwindcss": "^4.1.11",
  // ... other deps
}
```

## Conclusion

The migration to Tailwind v4 required understanding its new architecture where PostCSS integration is decoupled and theme configuration moves from JavaScript to CSS. The fix was straightforward once the requirements were understood, but the initial error messages were not immediately clear about the missing `@tailwindcss/postcss` package.
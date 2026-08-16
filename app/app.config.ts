export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'zinc'
    },
    // Cards sit on top of the animated background, so make them frosted glass
    // once here rather than repeating classes on every <UCard>.
    card: {
      slots: {
        root: 'rounded-xl croissant-shadow'
      },
      variants: {
        variant: {
          outline: {
            root: 'bg-default/75 backdrop-blur-md ring ring-default divide-y divide-default'
          }
        }
      }
    }
  }
})

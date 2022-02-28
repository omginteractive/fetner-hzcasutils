declare module '@hzdg/gitmoji' {
  interface Gitmoji {
    emoji: string;
    code: string;
    description: string;
    name: string;
    level?: 0 | 1 | 2;
  }
  const gitmoji: Gitmoji[];
  export = gitmoji;
}

declare module "gifshot" {
  const gifshot: {
    createGIF: (
      options: Record<string, unknown>,
      callback: (result: { error: boolean; errorMsg?: string; image?: string }) => void
    ) => void;
  };
  export default gifshot;
}

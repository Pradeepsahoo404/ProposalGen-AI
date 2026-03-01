declare module "nodemailer" {
  const nodemailer: {
    createTransport: (options: unknown) => {
      sendMail: (options: { from: string; to: string; subject: string; text?: string; html?: string }) => Promise<unknown>;
    };
  };
  export = nodemailer;
}

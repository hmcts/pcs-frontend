export function getFormData<T = any>(req: Express.Request, step: string): T | undefined {
  return req.session.formData?.[step];
}

export function setFormData(req: Express.Request, step: string, data: Record<string, any>): void {
  req.session.formData = req.session.formData || {};
  req.session.formData[step] = data;
}

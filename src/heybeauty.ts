/**
 * HeyBeauty API Client
 * request apis from heybeauty.ai
 */
export class HeyBeautyClient {
  private readonly apiBaseUrl: string = "https://heybeauty.ai/api";
  private readonly apiKey: string;

  /**
   * constructor
   * @param apiKey - api key applied from heybeauty.ai
   * @param apiBaseUrl - api base url
   */
  constructor({ apiKey, apiBaseUrl }: { apiKey: string; apiBaseUrl?: string }) {
    this.apiKey = apiKey;
    this.apiBaseUrl = apiBaseUrl || this.apiBaseUrl;
  }

  /**
   * get clothes for try on
   * @returns clothes
   */
  async getClothes() {
    try {
      const req = {
        page: 1,
        limit: 10,
      };
      const resp = await fetch(`${this.apiBaseUrl}/get-clothes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(req),
      });

      if (!resp.ok) {
        throw new Error("request failed with status " + resp.status);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async submitTask({
    user_img_url,
    cloth_img_url,
    cloth_id,
    cloth_description,
  }: {
    user_img_url: string;
    cloth_img_url: string;
    cloth_id?: string;
    cloth_description?: string;
  }) {
    try {
      if (!user_img_url || !cloth_img_url) {
        throw new Error("user_img_url and cloth_img_url are required");
      }

      const req: any = {
        user_img_url,
        cloth_img_url,
        category: "1",
        is_sync: "0",
      };
      if (cloth_id) {
        req.cloth_id = cloth_id;
      }
      if (cloth_description) {
        req.caption = cloth_description;
      }

      console.log(req);

      const resp = await fetch(`${this.apiBaseUrl}/mcp-vton`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(req),
      });

      if (!resp.ok) {
        throw new Error("request failed with status " + resp.status);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      return {
        task_id: data.uuid,
        created_at: data.created_at,
        updated_at: data.updated_at,
        status: data.status,
        tryon_img_url: data.tryon_img_url || "",
      };
    } catch (error) {
      throw error;
    }
  }

  async queryTask({ task_id }: { task_id: string }) {
    try {
      const uri = `${this.apiBaseUrl}/get-task-info`;
      const req = {
        task_uuid: task_id,
      };

      const resp = await fetch(uri, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(req),
      });

      if (!resp.ok) {
        throw new Error("request failed with status: " + resp.status);
      }

      const { code, message, data } = await resp.json();

      if (code !== 0) {
        throw new Error(message);
      }

      return {
        task_id: task_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        status: data.status,
        tryon_img_url: data.tryon_img_url || "",
      };
    } catch (err) {
      throw err;
    }
  }
}

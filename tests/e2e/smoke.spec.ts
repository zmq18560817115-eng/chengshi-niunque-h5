import { expect, test } from "@playwright/test";
test("public and admin shells respond",async({page})=>{await page.goto("/");await expect(page.getByRole("heading",{name:/诚实/})).toBeVisible();await page.goto("/admin");await expect(page.getByRole("heading",{name:"内容管理后台"})).toBeVisible();});
test("health responds",async({request})=>{const response=await request.get("/api/health");expect(response.ok()).toBeTruthy();expect(await response.json()).toMatchObject({status:"ok"});});

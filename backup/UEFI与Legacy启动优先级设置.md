在BIOS/UEFI固件中，**UEFI** 与 **Legacy（传统BIOS）** 是两种不同的引导模式，它们直接影响系统安装方式、启动速度以及硬件兼容性。

**UEFI模式** 是现代主板的标准，支持 GPT分区表、大于2TB的硬盘、更快的启动速度以及 **安全启动(Secure Boot)** 功能，适合安装 Windows 8/10/11 等新系统。 **Legacy模式** 则基于传统BIOS，只支持 **MBR分区**表，兼容旧硬件和旧系统（如 Windows XP/7），但启动速度较慢。

**设置启动优先级的常见步骤（不同主板略有差异）：**
- **关闭安全启动**：在 Security 菜单中将 Secure Boot 设为 Disable（部分主板仅UEFI模式可用）。
- **选择启动模式**：在 Boot Mode 中选择 UEFI 或 Legacy Support。
- **调整优先级** ：在 Boot Priority 中设为 UEFI First 或 Legacy First。
- **启用USB启动**：确保 USB Boot 为 Enabled，以便从U盘安装系统。

**选择模式的建议：**
 - **优先UEFI：**2012年后生产的电脑几乎都支持，启动更快，支持大容量硬盘，且是 Windows 11 的强制要求。
 - **选择Legacy的场景：** 旧主板不支持UEFI、需保留MBR分区、安装旧系统或遇到UEFI兼容性问题时。
**核心原则：** 启动模式必须与磁盘分区表匹配： UEFI + GPT ✅ Legacy + MBR ✅ 其他组合 ❌（除非开启CSM兼容模式）^2^。

**实用技巧：**
  - 制作启动U盘时建议选择 UEFI/Legacy双启动，可自动适配不同硬件，避免因模式不匹配导致无法启动。
  - 在启动菜单中，带“UEFI”字样的启动项即为UEFI模式，未标注的通常是Legacy模式。
  - 使用4TB以上硬盘必须选择UEFI + GPT，否则无法完整识别容量。
[![安装PE到U盘，默认选择方案一:UEFI/Legacy全能三分区方式](https://i.postimg.cc/Bt9L9yQB/an-zhuang-PE-dao-U-pan.webp)](https://postimg.cc/jncdyMfD)
**总结：** 
      现代系统安装应**优先选择UEFI**，仅在特殊兼容需求下使用Legacy，并确保与硬盘分区表格式匹配，以避免安装或启动失败。 这样既能获得更快的启动速度，也能为未来系统升级做好准备。

<!-- ##{
    "head": "<link rel='canonical' href='https://ibitbetter.github.io/post/150.html'><script type='application/ld+json'>{\"@context\":\"https://schema.org\",\"@type\":\"Article\",\"headline\":\"UEFI与Legacy启动优先级设置\",\"datePublished\":\"2026-06-25\",\"author\":{\"@type\":\"Person\",\"name\":\"iBitBetter\"},\"image\":\"https://ibitbetter.github.io/og-image.jpg\",\"url\":\"https://ibitbetter.github.io/post/150.html\"}</script>"
}## -->
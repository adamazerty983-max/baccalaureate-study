import os
import sys
import threading
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from markitdown import MarkItDown

class MarkItDownApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Microsoft MarkItDown - محول الملفات إلى Markdown")
        self.root.geometry("820x680")
        self.root.minsize(680, 520)

        # Set background colors for a clean modern look
        self.bg_color = "#0f172a"
        self.card_bg = "#1e293b"
        self.card_border = "#334155"
        self.text_primary = "#f8fafc"
        self.text_secondary = "#94a3b8"
        self.accent_teal = "#0d9488"
        self.accent_teal_hover = "#0f766e"
        self.accent_cyan = "#06b6d4"

        self.root.configure(bg=self.bg_color)
        self.selected_file_path = None
        self.converted_text = ""
        self.converter = MarkItDown()

        self._setup_styles()
        self._build_ui()

    def _setup_styles(self):
        self.style = ttk.Style()
        self.style.theme_use("clam")

        # Configure progress bar
        self.style.configure(
            "Teal.Horizontal.TProgressbar",
            troughcolor=self.card_bg,
            bordercolor=self.card_border,
            background=self.accent_cyan,
            lightcolor=self.accent_cyan,
            darkcolor=self.accent_teal
        )

    def _build_ui(self):
        # 1. Header Frame
        header = tk.Frame(self.root, bg=self.bg_color, pady=12, padx=20)
        header.pack(fill="x")

        title_lbl = tk.Label(
            header,
            text="📄 Microsoft MarkItDown Studio",
            font=("Segoe UI", 16, "bold"),
            fg=self.text_primary,
            bg=self.bg_color
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            header,
            text="أداة تحويل مستندات PDF وExcel وWord وPowerPoint إلى نصوص Markdown (.md) نقية ومنظمة",
            font=("Segoe UI", 10),
            fg=self.text_secondary,
            bg=self.bg_color
        )
        sub_lbl.pack(anchor="w", pady=(2, 0))

        # 2. Card: File Selection
        file_card = tk.Frame(self.root, bg=self.card_bg, bd=1, relief="solid", highlightbackground=self.card_border, highlightthickness=1)
        file_card.pack(fill="x", padx=20, pady=8)

        fc_inner = tk.Frame(file_card, bg=self.card_bg, padx=16, pady=14)
        fc_inner.pack(fill="x")

        # Top row: Browse button + info
        btn_browse = tk.Button(
            fc_inner,
            text="📁 اختيار ملف (Browse...)",
            font=("Segoe UI", 10, "bold"),
            bg=self.accent_teal,
            fg="white",
            activebackground=self.accent_teal_hover,
            activeforeground="white",
            relief="flat",
            padx=14,
            pady=6,
            cursor="hand2",
            command=self.browse_file
        )
        btn_browse.pack(side="left")

        self.lbl_selected_file = tk.Label(
            fc_inner,
            text="لم يتم اختيار أي ملف بعد (اسحب ملفاً أو اضغط اختيار ملف)",
            font=("Segoe UI", 10),
            fg=self.text_secondary,
            bg=self.card_bg,
            padx=12
        )
        self.lbl_selected_file.pack(side="left", fill="x", expand=True)

        self.btn_convert = tk.Button(
            fc_inner,
            text="⚡ تحويل الآن",
            font=("Segoe UI", 10, "bold"),
            bg="#0284c7",
            fg="white",
            activebackground="#0369a1",
            activeforeground="white",
            relief="flat",
            padx=16,
            pady=6,
            cursor="hand2",
            state="disabled",
            command=self.start_conversion
        )
        self.btn_convert.pack(side="right")

        # Progress bar
        self.prog_bar = ttk.Progressbar(file_card, style="Teal.Horizontal.TProgressbar", mode="indeterminate")

        # 3. Status Bar
        self.status_lbl = tk.Label(
            self.root,
            text="جاهز. الصيغ المدعومة: PDF, XLSX, DOCX, PPTX, HTML, CSV",
            font=("Segoe UI", 9),
            fg=self.text_secondary,
            bg=self.bg_color,
            anchor="w"
        )
        self.status_lbl.pack(fill="x", padx=24, pady=(2, 6))

        # 4. Card: Result Preview
        result_card = tk.Frame(self.root, bg=self.card_bg, bd=1, relief="solid", highlightbackground=self.card_border, highlightthickness=1)
        result_card.pack(fill="both", expand=True, padx=20, pady=(0, 14))

        # Result Action Bar
        action_bar = tk.Frame(result_card, bg=self.card_bg, padx=14, pady=8)
        action_bar.pack(fill="x")

        res_title = tk.Label(
            action_bar,
            text="معاينة النص الناتج (Markdown Preview):",
            font=("Segoe UI", 10, "bold"),
            fg=self.text_primary,
            bg=self.card_bg
        )
        res_title.pack(side="left")

        # Action buttons
        self.btn_copy = tk.Button(
            action_bar,
            text="📋 نسخ النص",
            font=("Segoe UI", 9, "bold"),
            bg="#334155",
            fg="white",
            activebackground="#475569",
            activeforeground="white",
            relief="flat",
            padx=10,
            pady=4,
            cursor="hand2",
            state="disabled",
            command=self.copy_to_clipboard
        )
        self.btn_copy.pack(side="right", padx=(4, 0))

        self.btn_save = tk.Button(
            action_bar,
            text="💾 حفظ كملف (.md)",
            font=("Segoe UI", 9, "bold"),
            bg=self.accent_teal,
            fg="white",
            activebackground=self.accent_teal_hover,
            activeforeground="white",
            relief="flat",
            padx=12,
            pady=4,
            cursor="hand2",
            state="disabled",
            command=self.save_as_file
        )
        self.btn_save.pack(side="right", padx=(4, 4))

        self.btn_open_folder = tk.Button(
            action_bar,
            text="📂 فتح المجلد",
            font=("Segoe UI", 9),
            bg="#334155",
            fg="white",
            activebackground="#475569",
            activeforeground="white",
            relief="flat",
            padx=10,
            pady=4,
            cursor="hand2",
            state="disabled",
            command=self.open_output_folder
        )
        self.btn_open_folder.pack(side="right", padx=(4, 4))

        # Text Area with Scrollbar
        txt_container = tk.Frame(result_card, bg=self.card_bg)
        txt_container.pack(fill="both", expand=True, padx=14, pady=(0, 14))

        scrollbar = tk.Scrollbar(txt_container)
        scrollbar.pack(side="right", fill="y")

        self.txt_preview = tk.Text(
            txt_container,
            wrap="word",
            bg="#090d16",
            fg="#e2e8f0",
            insertbackground="#38bdf8",
            selectbackground="#0284c7",
            selectforeground="white",
            font=("Consolas", 10),
            padx=12,
            pady=12,
            bd=0,
            yscrollcommand=scrollbar.set
        )
        self.txt_preview.pack(fill="both", expand=True)
        scrollbar.config(command=self.txt_preview.yview)

    def browse_file(self):
        filetypes = [
            ("Supported Documents", "*.pdf;*.xlsx;*.xls;*.docx;*.pptx;*.csv;*.html;*.htm;*.txt;*.json;*.xml"),
            ("PDF Documents (*.pdf)", "*.pdf"),
            ("Excel Spreadsheets (*.xlsx, *.xls)", "*.xlsx;*.xls"),
            ("Word Documents (*.docx)", "*.docx"),
            ("PowerPoint Presentations (*.pptx)", "*.pptx"),
            ("All Files (*.*)", "*.*")
        ]
        chosen = filedialog.askopenfilename(title="اختر الملف المراد تحويله إلى Markdown", filetypes=filetypes)
        if chosen:
            self.selected_file_path = os.path.abspath(chosen)
            filename = os.path.basename(self.selected_file_path)
            size_kb = os.path.getsize(self.selected_file_path) / 1024
            self.lbl_selected_file.config(
                text=f"{filename} ({size_kb:.1f} KB)",
                fg=self.text_primary
            )
            self.btn_convert.config(state="normal", bg="#0284c7")
            self.status_lbl.config(
                text=f"تم تحديد الملف: {filename} — اضغط على 'تحويل الآن' للبدء.",
                fg=self.accent_cyan
            )

    def start_conversion(self):
        if not self.selected_file_path or not os.path.exists(self.selected_file_path):
            messagebox.showerror("خطأ", "الملف المحدد غير موجود!")
            return

        self.btn_convert.config(state="disabled")
        self.btn_save.config(state="disabled")
        self.btn_copy.config(state="disabled")
        self.btn_open_folder.config(state="disabled")

        # Show progress bar
        self.prog_bar.pack(fill="x", padx=16, pady=(0, 8))
        self.prog_bar.start(10)

        filename = os.path.basename(self.selected_file_path)
        self.status_lbl.config(
            text=f"⏳ جاري قراءة وتحويل الملف: {filename} ... يرجى الانتظار",
            fg="#f59e0b"
        )

        # Run conversion in background thread so UI never freezes
        threading.Thread(target=self._run_conversion_worker, daemon=True).start()

    def _run_conversion_worker(self):
        try:
            result = self.converter.convert(self.selected_file_path)
            markdown_content = result.text_content or ""

            # Auto save adjacent .md file
            base_name, _ = os.path.splitext(self.selected_file_path)
            self.auto_saved_path = f"{base_name}.md"
            with open(self.auto_saved_path, "w", encoding="utf-8") as f:
                f.write(markdown_content)

            self.root.after(0, self._on_conversion_success, markdown_content)
        except Exception as e:
            self.root.after(0, self._on_conversion_error, str(e))

    def _on_conversion_success(self, content):
        self.prog_bar.stop()
        self.prog_bar.pack_forget()

        self.converted_text = content
        self.txt_preview.delete("1.0", tk.END)
        self.txt_preview.insert(tk.END, content)

        self.btn_convert.config(state="normal")
        self.btn_save.config(state="normal")
        self.btn_copy.config(state="normal")
        self.btn_open_folder.config(state="normal")

        lines_count = len(content.splitlines())
        words_count = len(content.split())
        self.status_lbl.config(
            text=f"✅ تم التحويل بنجاح! ({lines_count} سطر، {words_count} كلمة) — تم الحفظ تلقائياً بجانب الملف الأصلي.",
            fg="#10b981"
        )

    def _on_conversion_error(self, err_msg):
        self.prog_bar.stop()
        self.prog_bar.pack_forget()
        self.btn_convert.config(state="normal")
        self.status_lbl.config(text=f"❌ فشل التحويل: {err_msg[:90]}", fg="#ef4444")
        messagebox.showerror("خطأ في التحويل", f"تعذر تحويل الملف:\n\n{err_msg}")

    def copy_to_clipboard(self):
        if not self.converted_text:
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(self.converted_text)
        self.status_lbl.config(text="📋 تم نسخ محتوى Markdown إلى الحافظة بنجاح!", fg=self.accent_cyan)

    def save_as_file(self):
        if not self.converted_text:
            return
        default_name = "output.md"
        if self.selected_file_path:
            base = os.path.splitext(os.path.basename(self.selected_file_path))[0]
            default_name = f"{base}.md"

        save_path = filedialog.asksaveasfilename(
            title="حفظ ملف Markdown",
            initialfile=default_name,
            defaultextension=".md",
            filetypes=[("Markdown Files (*.md)", "*.md"), ("Text Files (*.txt)", "*.txt")]
        )
        if save_path:
            with open(save_path, "w", encoding="utf-8") as f:
                f.write(self.converted_text)
            self.status_lbl.config(text=f"💾 تم حفظ الملف في: {os.path.basename(save_path)}", fg="#10b981")

    def open_output_folder(self):
        target = getattr(self, "auto_saved_path", self.selected_file_path)
        if target and os.path.exists(target):
            folder = os.path.dirname(target)
            if sys.platform == "win32":
                subprocess.Popen(f'explorer /select,"{target}"')
            else:
                subprocess.Popen(["xdg-open", folder])

def main():
    root = tk.Tk()
    app = MarkItDownApp(root)
    # Check if a file was passed as argument (e.g. from Open With or Drag onto .exe)
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        app.selected_file_path = os.path.abspath(sys.argv[1])
        filename = os.path.basename(app.selected_file_path)
        app.lbl_selected_file.config(text=filename, fg=app.text_primary)
        app.btn_convert.config(state="normal")
        app.start_conversion()

    root.mainloop()

if __name__ == "__main__":
    main()

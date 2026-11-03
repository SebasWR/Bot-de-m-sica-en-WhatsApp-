package com.sebaswr.botmusica;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Control remoto del bot: le manda comandos a Termux (donde corre el bot) para
 * prenderlo, apagarlo, ver la consola y saber si está prendido.
 */
public class MainActivity extends Activity {

    private static final String TERMUX = "com.termux";
    private static final String PERMISSION = "com.termux.permission.RUN_COMMAND";
    private static final String BASH = "/data/data/com.termux/files/usr/bin/bash";
    private static final String HOME = "/data/data/com.termux/files/home";
    private static final String BOT = HOME + "/bot-musica/termux/";
    private static final String INSTALL_CMD =
            "curl -fsSL \"https://raw.githubusercontent.com/SebasWR/Bot-de-m-sica-en-WhatsApp-/"
                    + "claude/project-thread-7kisu7/termux/instalar.sh?$(date +%s)\" -o ~/instalar.sh && bash ~/instalar.sh";
    private static final String FIX_CMD =
            "mkdir -p ~/.termux && sed -i '/^[[:space:]]*allow-external-apps/d' ~/.termux/termux.properties 2>/dev/null; "
                    + "echo 'allow-external-apps = true' >> ~/.termux/termux.properties && termux-reload-settings";
    private static final int REQ_STATUS = 1;
    /** Si Termux ya respondió bien una vez; si no, no consultamos solos para no llenar de notificaciones. */
    private static final String PREF_OK = "termux_ok";

    private TextView status;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(20);
        root.setPadding(pad, dp(32), pad, pad);

        TextView title = new TextView(this);
        title.setText("🎵 Bot de Música");
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        root.addView(title);

        status = new TextView(this);
        status.setTextSize(18);
        status.setGravity(Gravity.CENTER);
        status.setPadding(0, dp(16), 0, dp(16));
        root.addView(status);

        root.addView(button("▶  Prender bot", "#2E7D32", v -> {
            runBot("prender.sh", true);
            refreshLater();
        }));
        root.addView(button("■  Apagar bot", "#C62828", v -> {
            runBot("apagar.sh", true);
            refreshLater();
        }));
        root.addView(button("🖥  Ver consola / código de vinculación", "#1565C0", v -> runBot("ver.sh", false)));
        root.addView(button("⟳  Actualizar bot", "#6A1B9A", v -> {
            runBot("actualizar.sh", false);
            refreshLater();
        }));
        root.addView(button("Ver estado", "#455A64", v -> refreshStatus()));

        TextView setupTitle = new TextView(this);
        setupTitle.setText("Primera vez");
        setupTitle.setTextSize(18);
        setupTitle.setTypeface(Typeface.DEFAULT_BOLD);
        setupTitle.setPadding(0, dp(24), 0, dp(4));
        root.addView(setupTitle);

        TextView help = new TextView(this);
        help.setText("1. Instalá Termux desde F-Droid y abrilo una vez.\n"
                + "2. Tocá \"Copiar comando de instalación\", pegalo en Termux y dale Enter.\n"
                + "3. Cerrá y volvé a abrir Termux, y después esta app.\n"
                + "4. Dale permiso a la app cuando lo pida.");
        root.addView(help);

        root.addView(button("Copiar comando de instalación y abrir Termux", "#37474F",
                v -> copyAndOpen(INSTALL_CMD, "Copiado. Pegalo en Termux (mantené apretado → Paste)")));
        root.addView(button("Copiar comando para arreglar \"RunCommandService\"", "#37474F",
                v -> copyAndOpen(FIX_CMD, "Copiado. Pegalo en Termux, Enter, y después cerrá Termux (Exit) y abrilo de nuevo")));
        root.addView(button("Bajar Termux (F-Droid)", "#37474F", v -> open("https://f-droid.org/packages/com.termux/")));
        root.addView(button("Permitir que no se duerma (batería)", "#37474F", v -> openBatterySettings()));

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        setContentView(scroll);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (prefs().getBoolean(PREF_OK, false)) {
            refreshStatus();
        } else if (status.getText().length() == 0) {
            status.setText("Tocá \"Ver estado\" para comprobar el bot");
        }
    }

    private SharedPreferences prefs() {
        return getSharedPreferences("bot", MODE_PRIVATE);
    }

    private void setTermuxOk(boolean ok) {
        prefs().edit().putBoolean(PREF_OK, ok).apply();
    }

    private Button button(String text, String color, View.OnClickListener onClick) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(17);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(Color.parseColor(color));
        b.setOnClickListener(onClick);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(56));
        lp.topMargin = dp(10);
        b.setLayoutParams(lp);
        return b;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private boolean termuxInstalled() {
        try {
            getPackageManager().getPackageInfo(TERMUX, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /** Pide el permiso de Termux si falta. Devuelve true si ya se puede usar. */
    private boolean ready() {
        if (!termuxInstalled()) {
            status.setText("Falta instalar Termux");
            Toast.makeText(this, "Primero instalá Termux (F-Droid)", Toast.LENGTH_LONG).show();
            return false;
        }
        if (checkSelfPermission(PERMISSION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{PERMISSION}, 0);
            return false;
        }
        return true;
    }

    private Intent baseIntent(String script, boolean background) {
        Intent intent = new Intent();
        intent.setClassName(TERMUX, "com.termux.app.RunCommandService");
        intent.setAction("com.termux.RUN_COMMAND");
        intent.putExtra("com.termux.RUN_COMMAND_PATH", BASH);
        intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{BOT + script});
        intent.putExtra("com.termux.RUN_COMMAND_WORKDIR", HOME);
        intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", background);
        return intent;
    }

    private void runBot(String script, boolean background) {
        if (!ready()) return;
        try {
            startService(baseIntent(script, background));
            if (!background) openTermux();
        } catch (Exception e) {
            showSetupError(e);
        }
    }

    private void refreshStatus() {
        if (!termuxInstalled()) {
            status.setText("⚠️ Falta instalar Termux");
            return;
        }
        if (checkSelfPermission(PERMISSION) != PackageManager.PERMISSION_GRANTED) {
            status.setText("Tocá un botón para dar permiso");
            return;
        }
        status.setText("Consultando…");
        Intent intent = new Intent();
        intent.setClassName(TERMUX, "com.termux.app.RunCommandService");
        intent.setAction("com.termux.RUN_COMMAND");
        intent.putExtra("com.termux.RUN_COMMAND_PATH", BASH);
        intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"-c",
                "if [ ! -d ~/bot-musica ]; then echo NOINST; "
                        + "elif tmux has-session -t bot 2>/dev/null; then echo ON; else echo OFF; fi"});
        intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        int flags = Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0;
        PendingIntent pending = createPendingResult(REQ_STATUS, new Intent(), flags);
        intent.putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", pending);
        try {
            startService(intent);
        } catch (Exception e) {
            showSetupError(e);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_STATUS || data == null) return;
        Bundle result = data.getBundleExtra("result");
        String out = result == null ? "" : String.valueOf(result.getString("stdout", "")).trim();
        if (!out.isEmpty()) setTermuxOk(true);
        if (out.contains("ON")) {
            status.setText("🟢 Bot prendido");
        } else if (out.contains("NOINST")) {
            status.setText("⚠️ El bot todavía no está instalado en Termux");
        } else if (out.contains("OFF")) {
            status.setText("🔴 Bot apagado");
        } else {
            setTermuxOk(false);
            String err = result == null ? "" : String.valueOf(result.getString("errmsg", ""));
            if (err.contains("allow-external-apps")) {
                status.setText("⚠️ Termux no acepta comandos: tocá \"Copiar comando para arreglar\" abajo");
            } else {
                status.setText("No pude saber el estado" + (err.isEmpty() ? "" : " (" + err + ")"));
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) refreshStatus();
    }

    private void refreshLater() {
        if (prefs().getBoolean(PREF_OK, false)) handler.postDelayed(this::refreshStatus, 3000);
    }

    private void showSetupError(Exception e) {
        setTermuxOk(false);
        status.setText("⚠️ Termux no acepta comandos todavía");
        Toast.makeText(this,
                "Corré el comando de instalación en Termux y reiniciá Termux. (" + e.getMessage() + ")",
                Toast.LENGTH_LONG).show();
    }

    private void copyAndOpen(String cmd, String msg) {
        ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText("comando", cmd));
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
        openTermux();
    }

    private void openTermux() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(TERMUX);
        if (launch != null) {
            startActivity(launch);
        } else {
            open("https://f-droid.org/packages/com.termux/");
        }
    }

    private void openBatterySettings() {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + TERMUX));
            startActivity(i);
            Toast.makeText(this, "Batería → Sin restricciones", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            startActivity(new Intent(Settings.ACTION_SETTINGS));
        }
    }

    private void open(String url) {
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
    }
}

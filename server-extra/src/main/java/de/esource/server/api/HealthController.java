package de.esource.server.api;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lebenszeichen des Servers. Die Oberfläche nutzt ihn ab Stufe 3/4;
 * in Stufe 1 dient er nur als Prüfung, dass das Grundgerüst läuft.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "app", "E-Source");
    }
}

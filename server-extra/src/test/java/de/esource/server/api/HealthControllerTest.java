package de.esource.server.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;

import org.junit.jupiter.api.Test;

class HealthControllerTest {

    @Test
    void healthMeldetOk() {
        Map<String, String> body = new HealthController().health();
        assertEquals("ok", body.get("status"));
        assertEquals("E-Source", body.get("app"));
    }
}

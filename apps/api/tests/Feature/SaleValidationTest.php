<?php
namespace Tests\Feature;
use Tests\TestCase;
final class SaleValidationTest extends TestCase
{
    public function test_sale_requires_authentication(): void { $this->postJson('/api/sales', [])->assertUnauthorized(); }
}
